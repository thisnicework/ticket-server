import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types.js';

/**
 * 멀티테넌트 CORS 프리플라이트(OPTIONS) 및 기본 응답 헤더 처리
 * 실제 Origin 허용 여부 검증은 requireTenantAuth에서 테넌트별 allowed_origins로 수행합니다.
 */
export const multiTenantCors: MiddlewareHandler<AppEnv> = async (c, next) => {
  const origin = c.req.header('origin');

  if (c.req.method === 'OPTIONS') {
    if (origin) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Vary', 'Origin');
    }
    c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    c.header('Access-Control-Max-Age', '86400');
    return c.body(null, 204);
  }

  await next();

  // 에러 응답 등으로 인해 auth 미들웨어 이전에 종료된 경우에도 브라우저가 JSON 에러를 읽을 수 있도록 처리
  if (origin && !c.res.headers.has('Access-Control-Allow-Origin')) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Vary', 'Origin');
  }
};
