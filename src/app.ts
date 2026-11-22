import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { logger } from 'hono/logger';
import type { Database } from './db/index.js';
import { multiTenantCors } from './middleware/cors.js';
import { adminRouter } from './routes/admin.js';
import { platformRouter } from './routes/platform.js';
import { publicRouter } from './routes/public.js';
import type { AppEnv } from './types.js';
import { renderAdminPage } from './ui/adminPage.js';
import { AppError } from './utils/errors.js';

export interface CreateAppOptions {
  db: Database | null;
  platformMasterKey: string;
  enableLogger?: boolean;
}

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#2563EB"/><path d="M14 22C14 19.7909 15.7909 18 18 18H46C48.2091 18 50 19.7909 50 22V27C47.2386 27 45 29.2386 45 32C45 34.7614 47.2386 37 50 37V42C50 44.2091 48.2091 46 46 46H18C15.7909 46 14 44.2091 14 42V37C16.7614 37 19 34.7614 19 32C19 29.2386 16.7614 27 14 27V22Z" fill="white"/><path d="M36 22V42" stroke="#2563EB" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 4"/></svg>`;

export function createApp(options: CreateAppOptions) {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: '요청 형식이 올바르지 않습니다.',
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    },
  });

  if (options.enableLogger !== false) {
    app.use('*', logger());
  }

  // 의존성 주입
  app.use('*', async (c, next) => {
    if (options.db) {
      c.set('db', options.db);
    }
    c.set('platformMasterKey', options.platformMasterKey);
    await next();
  });

  // DB 필수 체크 (/v1/* 요청 시)
  app.use('/v1/*', async (c, next) => {
    if (c.req.method === 'OPTIONS') {
      await next();
      return;
    }
    if (!options.db) {
      throw new AppError(
        500,
        'DATABASE_NOT_CONFIGURED',
        'DATABASE_URL 환경변수가 설정되지 않았습니다. Vercel Project Settings -> Environment Variables를 확인해 주세요.',
      );
    }
    await next();
  });

  // CORS 처리
  app.use('/v1/*', multiTenantCors);

  // 헬스 체크 & 어드민 대시보드 UI
  app.get('/health', (c) =>
    c.json({
      ok: true,
      configured: {
        databaseUrl: Boolean(options.db),
        platformMasterKey: Boolean(options.platformMasterKey),
      },
      timestamp: new Date().toISOString(),
    }),
  );
  app.get('/', (c) => c.redirect('/admin'));
  app.get('/admin', (c) => c.html(renderAdminPage()));
  app.get('/favicon.svg', (c) =>
    c.body(FAVICON_SVG, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    }),
  );
  app.get('/favicon.ico', (c) =>
    c.body(FAVICON_SVG, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    }),
  );

  // 라우트 마운트
  app.route('/v1/platform', platformRouter);
  app.route('/v1/admin', adminRouter);
  app.route('/v1', publicRouter);

  // OpenAPI JSON & Swagger UI
  app.doc('/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'ticket-server (예매 서버) API',
      version: '1.0.0',
      description:
        '단일 Supabase PostgreSQL 기반 멀티테넌트 수량제 비회원 예매 플랫폼 API. ' +
        'Platform API는 Bearer <PLATFORM_MASTER_KEY>, Admin API는 Bearer sk_live_..., Public API는 X-API-Key: pk_live_... 헤더를 사용합니다.',
    },
  });

  app.get('/docs', swaggerUI({ url: '/openapi.json' }));

  // 전역 에러 핸들러
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(
        {
          error: {
            code: err.code,
            message: err.message,
            ...(err.details ? { details: err.details } : {}),
          },
        },
        err.status,
      );
    }

    console.error('[Unhandled Error]', err);
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '서버 내부 오류가 발생했습니다.',
        },
      },
      500,
    );
  });

  app.notFound((c) =>
    c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: `Route ${c.req.method} ${c.req.path} not found`,
        },
      },
      404,
    ),
  );

  return app;
}
