import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { events, schedules, ticketTypes } from '../db/schema.js';
import { requireTenantAuth } from '../middleware/auth.js';
import { createReservation, lookupReservations } from '../services/reservation.js';
import type { AppEnv } from '../types.js';
import { AppError } from '../utils/errors.js';

const publicRouter = new OpenAPIHono<AppEnv>();

publicRouter.use('*', requireTenantAuth('public'));

const PublicEventSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  venue: z.string().nullable(),
  posterUrl: z.string().nullable(),
  metadata: z.record(z.unknown()),
  createdAt: z.string(),
});

const PublicTicketTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number().int(),
  totalQuantity: z.number().int(),
  remainingQuantity: z.number().int(),
  maxPerReservation: z.number().int().nullable(),
});

const PublicScheduleSchema = z.object({
  id: z.string().uuid(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  salesOpenAt: z.string().nullable(),
  salesCloseAt: z.string().nullable(),
  ticketTypes: z.array(PublicTicketTypeSchema),
});

const ReservationResultSchema = z.object({
  id: z.string().uuid(),
  reservationCode: z.string(),
  scheduleId: z.string().uuid(),
  event: z.object({
    id: z.string().uuid(),
    title: z.string(),
    venue: z.string().nullable(),
  }),
  schedule: z.object({
    id: z.string().uuid(),
    startsAt: z.string(),
    endsAt: z.string().nullable(),
  }),
  customerName: z.string(),
  customerPhone: z.string(),
  totalQuantity: z.number().int(),
  totalAmount: z.number().int(),
  metadata: z.record(z.unknown()),
  items: z.array(
    z.object({
      ticketTypeId: z.string().uuid(),
      ticketTypeName: z.string(),
      quantity: z.number().int(),
      unitPrice: z.number().int(),
    }),
  ),
  createdAt: z.string(),
});

// 1. 활성 행사 목록 조회
const listEventsRoute = createRoute({
  method: 'get',
  path: '/events',
  tags: ['Public'],
  summary: '진행 중인 행사 목록 조회',
  responses: {
    200: {
      description: '행사 목록',
      content: {
        'application/json': {
          schema: z.object({ events: z.array(PublicEventSummarySchema) }),
        },
      },
    },
  },
});

publicRouter.openapi(listEventsRoute, async (c) => {
  const db = c.get('db');
  const tenant = c.get('tenant')!;

  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.tenantId, tenant.id), eq(events.isActive, true)))
    .orderBy(desc(events.createdAt));

  return c.json({
    events: rows.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      venue: e.venue,
      posterUrl: e.posterUrl,
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

// 2. 행사 상세 + 회차 + 권종별 잔여 수량 조회
const getEventDetailRoute = createRoute({
  method: 'get',
  path: '/events/{eventId}',
  tags: ['Public'],
  summary: '행사 상세 및 회차/권종별 잔여 수량 조회',
  request: {
    params: z.object({ eventId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: '행사 상세 정보',
      content: {
        'application/json': {
          schema: PublicEventSummarySchema.extend({
            schedules: z.array(PublicScheduleSchema),
          }),
        },
      },
    },
  },
});

publicRouter.openapi(getEventDetailRoute, async (c) => {
  const db = c.get('db');
  const tenant = c.get('tenant')!;
  const { eventId } = c.req.valid('param');

  const eventRows = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.tenantId, tenant.id), eq(events.isActive, true)))
    .limit(1);

  const event = eventRows[0];
  if (!event) {
    throw new AppError(404, 'EVENT_NOT_FOUND', '행사를 찾을 수 없습니다.');
  }

  const scheduleRows = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.tenantId, tenant.id),
        eq(schedules.eventId, event.id),
        eq(schedules.isActive, true),
      ),
    )
    .orderBy(asc(schedules.startsAt));

  const scheduleIds = scheduleRows.map((s) => s.id);
  const ticketTypeRows =
    scheduleIds.length > 0
      ? await db
          .select()
          .from(ticketTypes)
          .where(and(eq(ticketTypes.tenantId, tenant.id), inArray(ticketTypes.scheduleId, scheduleIds)))
          .orderBy(asc(ticketTypes.sortOrder), asc(ticketTypes.createdAt))
      : [];

  const typesBySchedule = new Map<string, Array<z.infer<typeof PublicTicketTypeSchema>>>();
  for (const tt of ticketTypeRows) {
    const list = typesBySchedule.get(tt.scheduleId) ?? [];
    list.push({
      id: tt.id,
      name: tt.name,
      price: tt.price,
      totalQuantity: tt.totalQuantity,
      remainingQuantity: tt.remainingQuantity,
      maxPerReservation: tt.maxPerReservation,
    });
    typesBySchedule.set(tt.scheduleId, list);
  }

  return c.json({
    id: event.id,
    title: event.title,
    description: event.description,
    venue: event.venue,
    posterUrl: event.posterUrl,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
    schedules: scheduleRows.map((s) => ({
      id: s.id,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt?.toISOString() ?? null,
      salesOpenAt: s.salesOpenAt?.toISOString() ?? null,
      salesCloseAt: s.salesCloseAt?.toISOString() ?? null,
      ticketTypes: typesBySchedule.get(s.id) ?? [],
    })),
  });
});

// 3. 비회원 수량제 예매 생성 (이름 + 연락처, 즉시 확정)
const createReservationRoute = createRoute({
  method: 'post',
  path: '/reservations',
  tags: ['Public'],
  summary: '비회원 예매 생성 (이름 + 연락처, 즉시 확정)',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            scheduleId: z.string().uuid(),
            customerName: z.string().min(1).max(100),
            customerPhone: z.string().min(8).max(30),
            items: z
              .array(
                z.object({
                  ticketTypeId: z.string().uuid(),
                  quantity: z.number().int().min(1).max(100),
                }),
              )
              .min(1),
            metadata: z.record(z.unknown()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: '확정된 예매 정보',
      content: { 'application/json': { schema: ReservationResultSchema } },
    },
  },
});

publicRouter.openapi(createReservationRoute, async (c) => {
  const db = c.get('db');
  const tenant = c.get('tenant')!;
  const body = c.req.valid('json');

  const result = await createReservation(db, {
    tenantId: tenant.id,
    scheduleId: body.scheduleId,
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    items: body.items,
    metadata: body.metadata,
  });

  return c.json(result, 201);
});

// 4. 비회원 예매 조회 (조회 전용 — 취소 불가)
const lookupReservationsRoute = createRoute({
  method: 'post',
  path: '/reservations/lookup',
  tags: ['Public'],
  summary: '비회원 예매 내역 조회 (이름+연락처 또는 예매번호+연락처)',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z
            .object({
              customerPhone: z.string().min(8).max(30),
              customerName: z.string().min(1).max(100).optional(),
              reservationCode: z.string().min(4).max(32).optional(),
            })
            .refine((data) => Boolean(data.customerName || data.reservationCode), {
              message: 'customerName 또는 reservationCode 중 하나는 필수입니다.',
            }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '조회된 예매 내역 목록',
      content: {
        'application/json': {
          schema: z.object({
            reservations: z.array(ReservationResultSchema),
          }),
        },
      },
    },
  },
});

publicRouter.openapi(lookupReservationsRoute, async (c) => {
  const db = c.get('db');
  const tenant = c.get('tenant')!;
  const body = c.req.valid('json');

  const list = await lookupReservations(db, {
    tenantId: tenant.id,
    customerPhone: body.customerPhone,
    customerName: body.customerName,
    reservationCode: body.reservationCode,
  });

  return c.json({ reservations: list });
});

export { publicRouter };
