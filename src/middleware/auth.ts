import { and, eq, isNull } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';
import { apiKeys, tenants } from '../db/schema.js';
import type { AppEnv } from '../types.js';
import { hashApiKey, timingSafeEqualStr } from '../utils/crypto.js';
import { AppError } from '../utils/errors.js';

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function extractApiKey(c: Parameters<MiddlewareHandler<AppEnv>>[0]): string | null {
  const headerKey = c.req.header('x-api-key')?.trim();
  if (headerKey) return headerKey;
  return extractBearerToken(c.req.header('authorization'));
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes('*') || allowedOrigins.includes(origin);
}

/**
 * 슈퍼 관리자(Platform) 인증 미들웨어
 * Authorization: Bearer <PLATFORM_MASTER_KEY>
 */
export const requirePlatformAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = extractBearerToken(c.req.header('authorization'));
  const masterKey = c.get('platformMasterKey');

  if (!masterKey) {
    throw new AppError(
      500,
      'MASTER_KEY_NOT_CONFIGURED',
      'PLATFORM_MASTER_KEY 환경변수가 설정되지 않았습니다. Vercel Environment Variables를 확인해 주세요.',
    );
  }

  if (!token || !timingSafeEqualStr(token, masterKey)) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid platform master key');
  }

  await next();
};

/**
 * 테넌트 API Key 인증 미들웨어
 * - requiredScope: 'public' -> public / admin 키 모두 허용
 * - requiredScope: 'admin'  -> admin 키만 허용
 */
export function requireTenantAuth(requiredScope: 'public' | 'admin'): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const rawKey = extractApiKey(c);
    if (!rawKey) {
      throw new AppError(401, 'API_KEY_MISSING', 'API key is required in X-API-Key or Authorization header');
    }

    const db = c.get('db');
    const keyHash = hashApiKey(rawKey);

    const rows = await db
      .select({
        apiKey: apiKeys,
        tenant: tenants,
      })
      .from(apiKeys)
      .innerJoin(tenants, eq(apiKeys.tenantId, tenants.id))
      .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
      .limit(1);

    const record = rows[0];
    if (!record) {
      throw new AppError(401, 'INVALID_API_KEY', 'API key is invalid or revoked');
    }

    if (!record.tenant.isActive) {
      throw new AppError(403, 'TENANT_INACTIVE', 'This ticketing site is currently inactive');
    }

    if (requiredScope === 'admin' && record.apiKey.scope !== 'admin') {
      throw new AppError(403, 'INSUFFICIENT_SCOPE', 'Admin API key (sk_*) is required for this endpoint');
    }

    // 브라우저 요청(Origin 헤더 존재) 시 public 키에 대해 allowed_origins 검증
    const origin = c.req.header('origin');
    if (record.apiKey.scope === 'public' && !isOriginAllowed(origin, record.tenant.allowedOrigins)) {
      throw new AppError(403, 'ORIGIN_NOT_ALLOWED', `Origin '${origin}' is not allowed for this site`);
    }

    if (origin && isOriginAllowed(origin, record.tenant.allowedOrigins)) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Vary', 'Origin');
    }

    c.set('tenant', record.tenant);
    c.set('apiKey', record.apiKey);

    // lastUsedAt 비동기 갱신 (실패해도 요청 흐름 차단하지 않음)
    void db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, record.apiKey.id))
      .catch(() => {});

    await next();
  };
}
