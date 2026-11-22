import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  apiKeys,
  events,
  reservationItems,
  reservations,
  schedules,
  tenants,
  ticketTypes,
} from '../db/schema.js';
import { requirePlatformAuth } from '../middleware/auth.js';
import type { AppEnv } from '../types.js';
import { generateApiKey } from '../utils/crypto.js';
import { AppError } from '../utils/errors.js';
import { normalizeName, normalizePhone } from '../utils/phone.js';

const platformRouter = new OpenAPIHono<AppEnv>();

platformRouter.use('*', requirePlatformAuth);

const TenantSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  allowedOrigins: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.string(),
});

const ApiKeyMetaSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  keyPrefix: z.string(),
  scope: z.enum(['public', 'admin']),
  revokedAt: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
});

// 1. 테넌트(예매 사이트) 생성
const createTenantRoute = createRoute({
  method: 'post',
  path: '/tenants',
  tags: ['Platform'],
  summary: '새 예매 사이트(Tenant) 등록',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            slug: z
              .string()
              .min(2)
              .max(64)
              .regex(/^[a-z0-9-]+$/, '소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.'),
            name: z.string().min(1).max(120),
            allowedOrigins: z.array(z.string().min(1)).default([]),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: '생성된 테넌트 정보',
      content: { 'application/json': { schema: TenantSchema } },
    },
  },
});

platformRouter.openapi(createTenantRoute, async (c) => {
  const db = c.get('db');
  const body = c.req.valid('json');

  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, body.slug))
    .limit(1);

  if (existing[0]) {
    throw new AppError(409, 'TENANT_SLUG_EXISTS', `Slug '${body.slug}' is already in use`);
  }

  const [created] = await db
    .insert(tenants)
    .values({
      slug: body.slug,
      name: body.name,
      allowedOrigins: body.allowedOrigins,
    })
    .returning();

  return c.json(
    {
      id: created.id,
      slug: created.slug,
      name: created.name,
      allowedOrigins: created.allowedOrigins,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
    },
    201,
  );
});

// 2. 테넌트 목록 조회
const listTenantsRoute = createRoute({
  method: 'get',
  path: '/tenants',
  tags: ['Platform'],
  summary: '등록된 모든 예매 사이트 목록 조회',
  responses: {
    200: {
      description: '테넌트 목록',
      content: { 'application/json': { schema: z.object({ tenants: z.array(TenantSchema) }) } },
    },
  },
});

platformRouter.openapi(listTenantsRoute, async (c) => {
  const db = c.get('db');
  const rows = await db.select().from(tenants).orderBy(desc(tenants.createdAt));

  return c.json({
    tenants: rows.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      allowedOrigins: t.allowedOrigins,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

// 3. 테넌트 수정 (허용 도메인, 활성 여부 등)
const updateTenantRoute = createRoute({
  method: 'patch',
  path: '/tenants/{tenantId}',
  tags: ['Platform'],
  summary: '예매 사이트 설정 수정',
  request: {
    params: z.object({ tenantId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1).max(120).optional(),
            allowedOrigins: z.array(z.string().min(1)).optional(),
            isActive: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '수정된 테넌트 정보',
      content: { 'application/json': { schema: TenantSchema } },
    },
  },
});

platformRouter.openapi(updateTenantRoute, async (c) => {
  const db = c.get('db');
  const { tenantId } = c.req.valid('param');
  const body = c.req.valid('json');

  const [updated] = await db
    .update(tenants)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.allowedOrigins !== undefined ? { allowedOrigins: body.allowedOrigins } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId))
    .returning();

  if (!updated) {
    throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
  }

  return c.json({
    id: updated.id,
    slug: updated.slug,
    name: updated.name,
    allowedOrigins: updated.allowedOrigins,
    isActive: updated.isActive,
    createdAt: updated.createdAt.toISOString(),
  });
});

// 4. 테넌트 API Key 발급
const createApiKeyRoute = createRoute({
  method: 'post',
  path: '/tenants/{tenantId}/api-keys',
  tags: ['Platform'],
  summary: '예매 사이트용 API Key 발급 (원본 키는 응답 시 1회만 노출)',
  request: {
    params: z.object({ tenantId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1).max(100),
            scope: z.enum(['public', 'admin']),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: '발급된 API Key (apiKey 필드를 안전하게 보관하세요)',
      content: {
        'application/json': {
          schema: ApiKeyMetaSchema.extend({ apiKey: z.string() }),
        },
      },
    },
  },
});

platformRouter.openapi(createApiKeyRoute, async (c) => {
  const db = c.get('db');
  const { tenantId } = c.req.valid('param');
  const body = c.req.valid('json');

  const tenantRows = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenantRows[0]) {
    throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
  }

  const generated = generateApiKey(body.scope);
  const [created] = await db
    .insert(apiKeys)
    .values({
      tenantId,
      name: body.name,
      keyPrefix: generated.keyPrefix,
      keyHash: generated.keyHash,
      scope: body.scope,
    })
    .returning();

  return c.json(
    {
      id: created.id,
      tenantId: created.tenantId,
      name: created.name,
      keyPrefix: created.keyPrefix,
      scope: created.scope,
      revokedAt: null,
      lastUsedAt: null,
      createdAt: created.createdAt.toISOString(),
      apiKey: generated.rawKey,
    },
    201,
  );
});

// 5. 테넌트 API Key 목록 조회
const listApiKeysRoute = createRoute({
  method: 'get',
  path: '/tenants/{tenantId}/api-keys',
  tags: ['Platform'],
  summary: '예매 사이트의 API Key 목록 조회',
  request: {
    params: z.object({ tenantId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'API Key 목록',
      content: { 'application/json': { schema: z.object({ apiKeys: z.array(ApiKeyMetaSchema) }) } },
    },
  },
});

platformRouter.openapi(listApiKeysRoute, async (c) => {
  const db = c.get('db');
  const { tenantId } = c.req.valid('param');

  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.tenantId, tenantId))
    .orderBy(desc(apiKeys.createdAt));

  return c.json({
    apiKeys: rows.map((k) => ({
      id: k.id,
      tenantId: k.tenantId,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scope: k.scope,
      revokedAt: k.revokedAt?.toISOString() ?? null,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })),
  });
});

// 6. API Key 폐기
const revokeApiKeyRoute = createRoute({
  method: 'delete',
  path: '/tenants/{tenantId}/api-keys/{keyId}',
  tags: ['Platform'],
  summary: 'API Key 폐기',
  request: {
    params: z.object({
      tenantId: z.string().uuid(),
      keyId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: '폐기 완료',
      content: { 'application/json': { schema: z.object({ revoked: z.boolean(), id: z.string().uuid() }) } },
    },
  },
});

platformRouter.openapi(revokeApiKeyRoute, async (c) => {
  const db = c.get('db');
  const { tenantId, keyId } = c.req.valid('param');

  const [updated] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId), isNull(apiKeys.revokedAt)))
    .returning();

  if (!updated) {
    throw new AppError(404, 'API_KEY_NOT_FOUND', 'Active API key not found');
  }

  return c.json({ revoked: true, id: updated.id });
});

// ==================== 플랫폼 통합 관리용 테넌트 데이터 엔드포인트 ====================

// 7. 테넌트 전체 현황 (행사 -> 회차 -> 권종 트리 + 요약 통계)
const tenantOverviewRoute = createRoute({
  method: 'get',
  path: '/tenants/{tenantId}/overview',
  tags: ['Platform'],
  summary: '특정 예매 사이트의 행사/회차/권종 및 예매 요약 통계 조회',
  request: {
    params: z.object({ tenantId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: '사이트 전체 현황',
      content: {
        'application/json': {
          schema: z.object({
            stats: z.object({
              eventCount: z.number().int(),
              reservationCount: z.number().int(),
              totalTicketsReserved: z.number().int(),
            }),
            events: z.array(
              z.object({
                id: z.string().uuid(),
                title: z.string(),
                description: z.string().nullable(),
                venue: z.string().nullable(),
                posterUrl: z.string().nullable(),
                isActive: z.boolean(),
                createdAt: z.string(),
                schedules: z.array(
                  z.object({
                    id: z.string().uuid(),
                    startsAt: z.string(),
                    endsAt: z.string().nullable(),
                    salesOpenAt: z.string().nullable(),
                    salesCloseAt: z.string().nullable(),
                    isActive: z.boolean(),
                    ticketTypes: z.array(
                      z.object({
                        id: z.string().uuid(),
                        name: z.string(),
                        price: z.number().int(),
                        totalQuantity: z.number().int(),
                        remainingQuantity: z.number().int(),
                        maxPerReservation: z.number().int().nullable(),
                        sortOrder: z.number().int(),
                      }),
                    ),
                  }),
                ),
              }),
            ),
          }),
        },
      },
    },
  },
});

platformRouter.openapi(tenantOverviewRoute, async (c) => {
  const db = c.get('db');
  const { tenantId } = c.req.valid('param');

  const [eventRows, scheduleRows, ticketTypeRows, statsRows] = await Promise.all([
    db.select().from(events).where(eq(events.tenantId, tenantId)).orderBy(desc(events.createdAt)),
    db.select().from(schedules).where(eq(schedules.tenantId, tenantId)).orderBy(asc(schedules.startsAt)),
    db
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.tenantId, tenantId))
      .orderBy(asc(ticketTypes.sortOrder), asc(ticketTypes.createdAt)),
    db
      .select({
        reservationCount: sql<number>`count(*)::int`,
        totalTicketsReserved: sql<number>`coalesce(sum(${reservations.totalQuantity}), 0)::int`,
      })
      .from(reservations)
      .where(eq(reservations.tenantId, tenantId)),
  ]);

  const typesBySchedule = new Map<string, typeof ticketTypeRows>();
  for (const tt of ticketTypeRows) {
    const list = typesBySchedule.get(tt.scheduleId) ?? [];
    list.push(tt);
    typesBySchedule.set(tt.scheduleId, list);
  }

  const schedulesByEvent = new Map<string, typeof scheduleRows>();
  for (const s of scheduleRows) {
    const list = schedulesByEvent.get(s.eventId) ?? [];
    list.push(s);
    schedulesByEvent.set(s.eventId, list);
  }

  return c.json({
    stats: {
      eventCount: eventRows.length,
      reservationCount: statsRows[0]?.reservationCount ?? 0,
      totalTicketsReserved: statsRows[0]?.totalTicketsReserved ?? 0,
    },
    events: eventRows.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      venue: e.venue,
      posterUrl: e.posterUrl,
      isActive: e.isActive,
      createdAt: e.createdAt.toISOString(),
      schedules: (schedulesByEvent.get(e.id) ?? []).map((s) => ({
        id: s.id,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt?.toISOString() ?? null,
        salesOpenAt: s.salesOpenAt?.toISOString() ?? null,
        salesCloseAt: s.salesCloseAt?.toISOString() ?? null,
        isActive: s.isActive,
        ticketTypes: (typesBySchedule.get(s.id) ?? []).map((tt) => ({
          id: tt.id,
          name: tt.name,
          price: tt.price,
          totalQuantity: tt.totalQuantity,
          remainingQuantity: tt.remainingQuantity,
          maxPerReservation: tt.maxPerReservation,
          sortOrder: tt.sortOrder,
        })),
      })),
    })),
  });
});

// 8. 플랫폼 어드민: 행사 생성 / 수정
const platformCreateEventRoute = createRoute({
  method: 'post',
  path: '/tenants/{tenantId}/events',
  tags: ['Platform'],
  summary: '특정 사이트에 행사 등록',
  request: {
    params: z.object({ tenantId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            title: z.string().min(1).max(200),
            description: z.string().nullable().optional(),
            venue: z.string().max(200).nullable().optional(),
            posterUrl: z.string().url().nullable().optional(),
            isActive: z.boolean().default(true),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: '생성된 행사',
      content: {
        'application/json': {
          schema: z.object({ id: z.string().uuid(), title: z.string() }),
        },
      },
    },
  },
});

platformRouter.openapi(platformCreateEventRoute, async (c) => {
  const db = c.get('db');
  const { tenantId } = c.req.valid('param');
  const body = c.req.valid('json');

  const [created] = await db
    .insert(events)
    .values({
      tenantId,
      title: body.title,
      description: body.description ?? null,
      venue: body.venue ?? null,
      posterUrl: body.posterUrl ?? null,
      isActive: body.isActive,
    })
    .returning();

  return c.json({ id: created.id, title: created.title }, 201);
});

const platformUpdateEventRoute = createRoute({
  method: 'patch',
  path: '/tenants/{tenantId}/events/{eventId}',
  tags: ['Platform'],
  summary: '특정 사이트의 행사 수정/활성화 토글',
  request: {
    params: z.object({ tenantId: z.string().uuid(), eventId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            title: z.string().min(1).max(200).optional(),
            description: z.string().nullable().optional(),
            venue: z.string().max(200).nullable().optional(),
            isActive: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '수정 완료',
      content: { 'application/json': { schema: z.object({ id: z.string().uuid(), isActive: z.boolean() }) } },
    },
  },
});

platformRouter.openapi(platformUpdateEventRoute, async (c) => {
  const db = c.get('db');
  const { tenantId, eventId } = c.req.valid('param');
  const body = c.req.valid('json');

  const [updated] = await db
    .update(events)
    .set({
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.venue !== undefined ? { venue: body.venue } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(events.id, eventId), eq(events.tenantId, tenantId)))
    .returning();

  if (!updated) throw new AppError(404, 'EVENT_NOT_FOUND', '행사를 찾을 수 없습니다.');
  return c.json({ id: updated.id, isActive: updated.isActive });
});

// 9. 플랫폼 어드민: 회차 생성
const platformCreateScheduleRoute = createRoute({
  method: 'post',
  path: '/tenants/{tenantId}/events/{eventId}/schedules',
  tags: ['Platform'],
  summary: '특정 행사에 회차 등록',
  request: {
    params: z.object({ tenantId: z.string().uuid(), eventId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            startsAt: z.string().datetime(),
            endsAt: z.string().datetime().nullable().optional(),
            salesOpenAt: z.string().datetime().nullable().optional(),
            salesCloseAt: z.string().datetime().nullable().optional(),
            isActive: z.boolean().default(true),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: '등록된 회차',
      content: { 'application/json': { schema: z.object({ id: z.string().uuid() }) } },
    },
  },
});

platformRouter.openapi(platformCreateScheduleRoute, async (c) => {
  const db = c.get('db');
  const { tenantId, eventId } = c.req.valid('param');
  const body = c.req.valid('json');

  const [created] = await db
    .insert(schedules)
    .values({
      tenantId,
      eventId,
      startsAt: new Date(body.startsAt),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      salesOpenAt: body.salesOpenAt ? new Date(body.salesOpenAt) : null,
      salesCloseAt: body.salesCloseAt ? new Date(body.salesCloseAt) : null,
      isActive: body.isActive,
    })
    .returning();

  return c.json({ id: created.id }, 201);
});

const platformUpdateScheduleRoute = createRoute({
  method: 'patch',
  path: '/tenants/{tenantId}/schedules/{scheduleId}',
  tags: ['Platform'],
  summary: '특정 회차 일시/예매기간/노출 상태 수정',
  request: {
    params: z.object({ tenantId: z.string().uuid(), scheduleId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            startsAt: z.string().datetime().optional(),
            endsAt: z.string().datetime().nullable().optional(),
            salesOpenAt: z.string().datetime().nullable().optional(),
            salesCloseAt: z.string().datetime().nullable().optional(),
            isActive: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '수정된 회차',
      content: {
        'application/json': {
          schema: z.object({
            id: z.string().uuid(),
            startsAt: z.string(),
            endsAt: z.string().nullable(),
            salesOpenAt: z.string().nullable(),
            salesCloseAt: z.string().nullable(),
            isActive: z.boolean(),
          }),
        },
      },
    },
  },
});

platformRouter.openapi(platformUpdateScheduleRoute, async (c) => {
  const db = c.get('db');
  const { tenantId, scheduleId } = c.req.valid('param');
  const body = c.req.valid('json');

  const [updated] = await db
    .update(schedules)
    .set({
      ...(body.startsAt !== undefined ? { startsAt: new Date(body.startsAt) } : {}),
      ...(body.endsAt !== undefined ? { endsAt: body.endsAt ? new Date(body.endsAt) : null } : {}),
      ...(body.salesOpenAt !== undefined
        ? { salesOpenAt: body.salesOpenAt ? new Date(body.salesOpenAt) : null }
        : {}),
      ...(body.salesCloseAt !== undefined
        ? { salesCloseAt: body.salesCloseAt ? new Date(body.salesCloseAt) : null }
        : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(schedules.id, scheduleId), eq(schedules.tenantId, tenantId)))
    .returning();

  if (!updated) throw new AppError(404, 'SCHEDULE_NOT_FOUND', '회차를 찾을 수 없습니다.');

  return c.json({
    id: updated.id,
    startsAt: updated.startsAt.toISOString(),
    endsAt: updated.endsAt?.toISOString() ?? null,
    salesOpenAt: updated.salesOpenAt?.toISOString() ?? null,
    salesCloseAt: updated.salesCloseAt?.toISOString() ?? null,
    isActive: updated.isActive,
  });
});

// 10. 플랫폼 어드민: 권종 생성 / 수정
const platformCreateTicketTypeRoute = createRoute({
  method: 'post',
  path: '/tenants/{tenantId}/schedules/{scheduleId}/ticket-types',
  tags: ['Platform'],
  summary: '특정 회차에 수량제 티켓 권종 등록',
  request: {
    params: z.object({ tenantId: z.string().uuid(), scheduleId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1).max(100),
            price: z.number().int().min(0).default(0),
            totalQuantity: z.number().int().min(1),
            maxPerReservation: z.number().int().min(1).nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: '등록된 권종',
      content: { 'application/json': { schema: z.object({ id: z.string().uuid() }) } },
    },
  },
});

platformRouter.openapi(platformCreateTicketTypeRoute, async (c) => {
  const db = c.get('db');
  const { tenantId, scheduleId } = c.req.valid('param');
  const body = c.req.valid('json');

  const [created] = await db
    .insert(ticketTypes)
    .values({
      tenantId,
      scheduleId,
      name: body.name,
      price: body.price,
      totalQuantity: body.totalQuantity,
      remainingQuantity: body.totalQuantity,
      maxPerReservation: body.maxPerReservation ?? null,
    })
    .returning();

  return c.json({ id: created.id }, 201);
});

const platformUpdateTicketTypeRoute = createRoute({
  method: 'patch',
  path: '/tenants/{tenantId}/ticket-types/{ticketTypeId}',
  tags: ['Platform'],
  summary: '특정 권종 수량/이름 수정',
  request: {
    params: z.object({ tenantId: z.string().uuid(), ticketTypeId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1).max(100).optional(),
            price: z.number().int().min(0).optional(),
            totalQuantity: z.number().int().min(0).optional(),
            maxPerReservation: z.number().int().min(1).nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '수정 완료',
      content: {
        'application/json': {
          schema: z.object({
            id: z.string().uuid(),
            totalQuantity: z.number().int(),
            remainingQuantity: z.number().int(),
          }),
        },
      },
    },
  },
});

platformRouter.openapi(platformUpdateTicketTypeRoute, async (c) => {
  const db = c.get('db');
  const { tenantId, ticketTypeId } = c.req.valid('param');
  const body = c.req.valid('json');

  const updated = await db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(ticketTypes)
      .where(and(eq(ticketTypes.id, ticketTypeId), eq(ticketTypes.tenantId, tenantId)))
      .limit(1);

    const existing = existingRows[0];
    if (!existing) throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', '티켓 권종을 찾을 수 없습니다.');

    let nextTotal = existing.totalQuantity;
    let nextRemaining = existing.remainingQuantity;
    if (body.totalQuantity !== undefined) {
      const reserved = existing.totalQuantity - existing.remainingQuantity;
      if (body.totalQuantity < reserved) {
        throw new AppError(
          400,
          'INVALID_TOTAL_QUANTITY',
          `이미 ${reserved}매가 예매되어 총 수량을 ${reserved} 미만으로 줄일 수 없습니다.`,
        );
      }
      nextTotal = body.totalQuantity;
      nextRemaining = body.totalQuantity - reserved;
    }

    const [row] = await tx
      .update(ticketTypes)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        totalQuantity: nextTotal,
        remainingQuantity: nextRemaining,
        ...(body.maxPerReservation !== undefined ? { maxPerReservation: body.maxPerReservation } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(ticketTypes.id, ticketTypeId), eq(ticketTypes.tenantId, tenantId)))
      .returning();

    return row;
  });

  return c.json({
    id: updated.id,
    totalQuantity: updated.totalQuantity,
    remainingQuantity: updated.remainingQuantity,
  });
});

// 11. 플랫폼 어드민: 특정 사이트 예매자 명단 조회
const platformListReservationsRoute = createRoute({
  method: 'get',
  path: '/tenants/{tenantId}/reservations',
  tags: ['Platform'],
  summary: '특정 사이트의 예매자 명단 조회',
  request: {
    params: z.object({ tenantId: z.string().uuid() }),
    query: z.object({
      scheduleId: z.string().uuid().optional(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(500).default(100),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  },
  responses: {
    200: {
      description: '예매 내역 목록',
      content: {
        'application/json': {
          schema: z.object({
            reservations: z.array(
              z.object({
                id: z.string().uuid(),
                reservationCode: z.string(),
                scheduleId: z.string().uuid(),
                eventTitle: z.string(),
                scheduleStartsAt: z.string(),
                customerName: z.string(),
                customerPhone: z.string(),
                totalQuantity: z.number().int(),
                totalAmount: z.number().int(),
                items: z.array(
                  z.object({
                    ticketTypeId: z.string().uuid(),
                    ticketTypeName: z.string(),
                    quantity: z.number().int(),
                    unitPrice: z.number().int(),
                  }),
                ),
                createdAt: z.string(),
              }),
            ),
          }),
        },
      },
    },
  },
});

platformRouter.openapi(platformListReservationsRoute, async (c) => {
  const db = c.get('db');
  const { tenantId } = c.req.valid('param');
  const query = c.req.valid('query');

  const conditions = [eq(reservations.tenantId, tenantId)];
  if (query.scheduleId) conditions.push(eq(reservations.scheduleId, query.scheduleId));
  if (query.customerName) conditions.push(eq(reservations.customerName, normalizeName(query.customerName)));
  if (query.customerPhone) conditions.push(eq(reservations.customerPhone, normalizePhone(query.customerPhone)));

  const rows = await db
    .select({
      reservation: reservations,
      scheduleStartsAt: schedules.startsAt,
      eventTitle: events.title,
    })
    .from(reservations)
    .innerJoin(schedules, eq(reservations.scheduleId, schedules.id))
    .innerJoin(events, eq(schedules.eventId, events.id))
    .where(and(...conditions))
    .orderBy(desc(reservations.createdAt))
    .limit(query.limit)
    .offset(query.offset);

  if (rows.length === 0) return c.json({ reservations: [] });

  const ids = rows.map((r) => r.reservation.id);
  const itemRows = await db
    .select({ item: reservationItems, ticketTypeName: ticketTypes.name })
    .from(reservationItems)
    .innerJoin(ticketTypes, eq(reservationItems.ticketTypeId, ticketTypes.id))
    .where(and(eq(reservationItems.tenantId, tenantId), inArray(reservationItems.reservationId, ids)));

  const itemsMap = new Map<
    string,
    Array<{ ticketTypeId: string; ticketTypeName: string; quantity: number; unitPrice: number }>
  >();

  for (const row of itemRows) {
    const list = itemsMap.get(row.item.reservationId) ?? [];
    list.push({
      ticketTypeId: row.item.ticketTypeId,
      ticketTypeName: row.ticketTypeName,
      quantity: row.item.quantity,
      unitPrice: row.item.unitPrice,
    });
    itemsMap.set(row.item.reservationId, list);
  }

  return c.json({
    reservations: rows.map(({ reservation, scheduleStartsAt, eventTitle }) => ({
      id: reservation.id,
      reservationCode: reservation.reservationCode,
      scheduleId: reservation.scheduleId,
      eventTitle,
      scheduleStartsAt: scheduleStartsAt.toISOString(),
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      totalQuantity: reservation.totalQuantity,
      totalAmount: reservation.totalAmount,
      items: itemsMap.get(reservation.id) ?? [],
      createdAt: reservation.createdAt.toISOString(),
    })),
  });
});

export { platformRouter };
