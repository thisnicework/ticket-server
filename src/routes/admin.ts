import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import {
  events,
  reservationItems,
  reservations,
  schedules,
  ticketTypes,
} from '../db/schema.js';
import { requireTenantAuth } from '../middleware/auth.js';
import { cancelReservation } from '../services/reservation.js';
import type { AppEnv } from '../types.js';
import { AppError } from '../utils/errors.js';
import { normalizeName, normalizePhone } from '../utils/phone.js';

const adminRouter = new OpenAPIHono<AppEnv>();

adminRouter.use('*', requireTenantAuth('admin'));

const EventResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  venue: z.string().nullable(),
  posterUrl: z.string().nullable(),
  isActive: z.boolean(),
  metadata: z.record(z.unknown()),
  createdAt: z.string(),
});

const ScheduleResponseSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  salesOpenAt: z.string().nullable(),
  salesCloseAt: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

const TicketTypeResponseSchema = z.object({
  id: z.string().uuid(),
  scheduleId: z.string().uuid(),
  name: z.string(),
  price: z.number().int(),
  totalQuantity: z.number().int(),
  remainingQuantity: z.number().int(),
  maxPerReservation: z.number().int().nullable(),
  sortOrder: z.number().int(),
});

// ==================== Events ====================

const createEventRoute = createRoute({
  method: 'post',
  path: '/events',
  tags: ['Admin'],
  summary: '행사 등록',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            title: z.string().min(1).max(200),
            description: z.string().nullable().optional(),
            venue: z.string().max(200).nullable().optional(),
            posterUrl: z.string().url().nullable().optional(),
            isActive: z.boolean().default(true),
            metadata: z.record(z.unknown()).default({}),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: '등록된 행사',
      content: { 'application/json': { schema: EventResponseSchema } },
    },
  },
});

adminRouter.openapi(createEventRoute, async (c) => {
  const db = c.get('db');
  const tenant = c.get('tenant')!;
  const body = c.req.valid('json');

  const [created] = await db
    .insert(events)
    .values({
      tenantId: tenant.id,
      title: body.title,
      description: body.description ?? null,
      venue: body.venue ?? null,
      posterUrl: body.posterUrl ?? null,
      isActive: body.isActive,
      metadata: body.metadata,
    })
    .returning();

  return c.json(
    {
      id: created.id,
      title: created.title,
      description: created.description,
      venue: created.venue,
      posterUrl: created.posterUrl,
      isActive: created.isActive,
      metadata: created.metadata,
      createdAt: created.createdAt.toISOString(),
    },
    201,
  );
});

const listAdminEventsRoute = createRoute({
  method: 'get',
  path: '/events',
  tags: ['Admin'],
  summary: '행사 목록 조회 (비활성 포함)',
  responses: {
    200: {
      description: '행사 목록',
      content: { 'application/json': { schema: z.object({ events: z.array(EventResponseSchema) }) } },
    },
  },
});

adminRouter.openapi(listAdminEventsRoute, async (c) => {
  const db = c.get('db');
  const tenant = c.get('tenant')!;

  const rows = await db
    .select()
    .from(events)
    .where(eq(events.tenantId, tenant.id))
    .orderBy(desc(events.createdAt));

  return c.json({
    events: rows.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      venue: e.venue,
      posterUrl: e.posterUrl,
      isActive: e.isActive,
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

const updateEventRoute = createRoute({
  method: 'patch',
  path: '/events/{eventId}',
  tags: ['Admin'],
  summary: '행사 수정',
  request: {
    params: z.object({ eventId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            title: z.string().min(1).max(200).optional(),
            description: z.string().nullable().optional(),
            venue: z.string().max(200).nullable().optional(),
            posterUrl: z.string().url().nullable().optional(),
            isActive: z.boolean().optional(),
            metadata: z.record(z.unknown()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '수정된 행사',
      content: { 'application/json': { schema: EventResponseSchema } },
    },
  },
});

adminRouter.openapi(updateEventRoute, async (c) => {
  const db = c.get('db');
  const tenant = c.get('tenant')!;
  const { eventId } = c.req.valid('param');
  const body = c.req.valid('json');

  const [updated] = await db
    .update(events)
    .set({
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.venue !== undefined ? { venue: body.venue } : {}),
      ...(body.posterUrl !== undefined ? { posterUrl: body.posterUrl } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(events.id, eventId), eq(events.tenantId, tenant.id)))
    .returning();

  if (!updated) {
    throw new AppError(404, 'EVENT_NOT_FOUND', '행사를 찾을 수 없습니다.');
  }

  return c.json({
    id: updated.id,
    title: updated.title,
    description: updated.description,
    venue: updated.venue,
    posterUrl: updated.posterUrl,
    isActive: updated.isActive,
    metadata: updated.metadata,
    createdAt: updated.createdAt.toISOString(),
  });
});

// ==================== Schedules ====================

const createScheduleRoute = createRoute({
  method: 'post',
  path: '/events/{eventId}/schedules',
  tags: ['Admin'],
  summary: '회차 등록',
  request: {
    params: z.object({ eventId: z.string().uuid() }),
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
      content: { 'application/json': { schema: ScheduleResponseSchema } },
    },
  },
});

adminRouter.openapi(createScheduleRoute, async (c) => {
  const db = c.get('db');
  const tenant = c.get('tenant')!;
  const { eventId } = c.req.valid('param');
  const body = c.req.valid('json');

  const eventRows = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.tenantId, tenant.id)))
    .limit(1);

  if (!eventRows[0]) {
    throw new AppError(404, 'EVENT_NOT_FOUND', '행사를 찾을 수 없습니다.');
  }

  const [created] = await db
    .insert(schedules)
    .values({
      tenantId: tenant.id,
      eventId,
      startsAt: new Date(body.startsAt),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      salesOpenAt: body.salesOpenAt ? new Date(body.salesOpenAt) : null,
      salesCloseAt: body.salesCloseAt ? new Date(body.salesCloseAt) : null,
      isActive: body.isActive,
    })
    .returning();

  return c.json(
    {
      id: created.id,
      eventId: created.eventId,
      startsAt: created.startsAt.toISOString(),
      endsAt: created.endsAt?.toISOString() ?? null,
      salesOpenAt: created.salesOpenAt?.toISOString() ?? null,
      salesCloseAt: created.salesCloseAt?.toISOString() ?? null,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
    },
    201,
  );
});

const updateScheduleRoute = createRoute({
  method: 'patch',
  path: '/schedules/{scheduleId}',
  tags: ['Admin'],
  summary: '회차 수정',
  request: {
    params: z.object({ scheduleId: z.string().uuid() }),
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
      content: { 'application/json': { schema: ScheduleResponseSchema } },
    },
  },
});

adminRouter.openapi(updateScheduleRoute, async (c) => {
  const db = c.get('db');
  const tenant = c.get('tenant')!;
  const { scheduleId } = c.req.valid('param');
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
    .where(and(eq(schedules.id, scheduleId), eq(schedules.tenantId, tenant.id)))
    .returning();

  if (!updated) {
    throw new AppError(404, 'SCHEDULE_NOT_FOUND', '회차를 찾을 수 없습니다.');
  }

  return c.json({
    id: updated.id,
    eventId: updated.eventId,
    startsAt: updated.startsAt.toISOString(),
    endsAt: updated.endsAt?.toISOString() ?? null,
    salesOpenAt: updated.salesOpenAt?.toISOString() ?? null,
    salesCloseAt: updated.salesCloseAt?.toISOString() ?? null,
    isActive: updated.isActive,
    createdAt: updated.createdAt.toISOString(),
  });
});

// ==================== Ticket Types (수량제 권종) ====================

const createTicketTypeRoute = createRoute({
  method: 'post',
  path: '/schedules/{scheduleId}/ticket-types',
  tags: ['Admin'],
  summary: '회차별 수량제 티켓 권종 등록',
  request: {
    params: z.object({ scheduleId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1).max(100),
            price: z.number().int().min(0).default(0),
            totalQuantity: z.number().int().min(1),
            maxPerReservation: z.number().int().min(1).nullable().optional(),
            sortOrder: z.number().int().default(0),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: '등록된 티켓 권종',
      content: { 'application/json': { schema: TicketTypeResponseSchema } },
    },
  },
});

adminRouter.openapi(createTicketTypeRoute, async (c) => {
  const db = c.get('db');
  const tenant = c.get('tenant')!;
  const { scheduleId } = c.req.valid('param');
  const body = c.req.valid('json');

  const scheduleRows = await db
    .select({ id: schedules.id })
    .from(schedules)
    .where(and(eq(schedules.id, scheduleId), eq(schedules.tenantId, tenant.id)))
    .limit(1);

  if (!scheduleRows[0]) {
    throw new AppError(404, 'SCHEDULE_NOT_FOUND', '회차를 찾을 수 없습니다.');
  }

  const [created] = await db
    .insert(ticketTypes)
    .values({
      tenantId: tenant.id,
      scheduleId,
      name: body.name,
      price: body.price,
      totalQuantity: body.totalQuantity,
      remainingQuantity: body.totalQuantity,
      maxPerReservation: body.maxPerReservation ?? null,
      sortOrder: body.sortOrder,
    })
    .returning();

  return c.json(
    {
      id: created.id,
      scheduleId: created.scheduleId,
      name: created.name,
      price: created.price,
      totalQuantity: created.totalQuantity,
      remainingQuantity: created.remainingQuantity,
      maxPerReservation: created.maxPerReservation,
      sortOrder: created.sortOrder,
    },
    201,
  );
});

const updateTicketTypeRoute = createRoute({
  method: 'patch',
  path: '/ticket-types/{ticketTypeId}',
  tags: ['Admin'],
  summary: '티켓 권종 수정 (총 수량 변경 시 기판매 수량을 보존하여 잔여 수량 자동 조정)',
  request: {
    params: z.object({ ticketTypeId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1).max(100).optional(),
            price: z.number().int().min(0).optional(),
            totalQuantity: z.number().int().min(0).optional(),
            maxPerReservation: z.number().int().min(1).nullable().optional(),
            sortOrder: z.number().int().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '수정된 티켓 권종',
      content: { 'application/json': { schema: TicketTypeResponseSchema } },
    },
  },
});

adminRouter.openapi(updateTicketTypeRoute, async (c) => {
  const db = c.get('db');
  const tenant = c.get('tenant')!;
  const { ticketTypeId } = c.req.valid('param');
  const body = c.req.valid('json');

  const updated = await db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(ticketTypes)
      .where(and(eq(ticketTypes.id, ticketTypeId), eq(ticketTypes.tenantId, tenant.id)))
      .limit(1);

    const existing = existingRows[0];
    if (!existing) {
      throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', '티켓 권종을 찾을 수 없습니다.');
    }

    let nextTotal = existing.totalQuantity;
    let nextRemaining = existing.remainingQuantity;

    if (body.totalQuantity !== undefined) {
      const reservedCount = existing.totalQuantity - existing.remainingQuantity;
      if (body.totalQuantity < reservedCount) {
        throw new AppError(
          400,
          'INVALID_TOTAL_QUANTITY',
          `이미 ${reservedCount}매가 예매되어 총 수량을 ${reservedCount} 미만으로 줄일 수 없습니다.`,
        );
      }
      nextTotal = body.totalQuantity;
      nextRemaining = body.totalQuantity - reservedCount;
    }

    const [row] = await tx
      .update(ticketTypes)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        totalQuantity: nextTotal,
        remainingQuantity: nextRemaining,
        ...(body.maxPerReservation !== undefined
          ? { maxPerReservation: body.maxPerReservation }
          : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(ticketTypes.id, ticketTypeId), eq(ticketTypes.tenantId, tenant.id)))
      .returning();

    return row;
  });

  return c.json({
    id: updated.id,
    scheduleId: updated.scheduleId,
    name: updated.name,
    price: updated.price,
    totalQuantity: updated.totalQuantity,
    remainingQuantity: updated.remainingQuantity,
    maxPerReservation: updated.maxPerReservation,
    sortOrder: updated.sortOrder,
  });
});

// ==================== Admin Reservations List ====================

const listAdminReservationsRoute = createRoute({
  method: 'get',
  path: '/reservations',
  tags: ['Admin'],
  summary: '사이트별 예매 내역 조회 (회차/이름/연락처 필터)',
  request: {
    query: z.object({
      scheduleId: z.string().uuid().optional(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50),
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
              }),
            ),
          }),
        },
      },
    },
  },
});

adminRouter.openapi(listAdminReservationsRoute, async (c) => {
  const db = c.get('db');
  const tenant = c.get('tenant')!;
  const query = c.req.valid('query');

  const conditions = [eq(reservations.tenantId, tenant.id)];
  if (query.scheduleId) {
    conditions.push(eq(reservations.scheduleId, query.scheduleId));
  }
  if (query.customerName) {
    conditions.push(eq(reservations.customerName, normalizeName(query.customerName)));
  }
  if (query.customerPhone) {
    conditions.push(eq(reservations.customerPhone, normalizePhone(query.customerPhone)));
  }

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

  if (rows.length === 0) {
    return c.json({ reservations: [] });
  }

  const ids = rows.map((r) => r.reservation.id);
  const itemRows = await db
    .select({
      item: reservationItems,
      ticketTypeName: ticketTypes.name,
    })
    .from(reservationItems)
    .innerJoin(ticketTypes, eq(reservationItems.ticketTypeId, ticketTypes.id))
    .where(and(eq(reservationItems.tenantId, tenant.id), inArray(reservationItems.reservationId, ids)))
    .orderBy(asc(ticketTypes.sortOrder));

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
      metadata: reservation.metadata,
      items: itemsMap.get(reservation.id) ?? [],
      createdAt: reservation.createdAt.toISOString(),
    })),
  });
});

const cancelAdminReservationRoute = createRoute({
  method: 'delete',
  path: '/reservations/{reservationId}',
  tags: ['Admin'],
  summary: '관리자 예매 취소 (잔여 수량 자동 복구)',
  request: {
    params: z.object({ reservationId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: '취소 완료',
      content: {
        'application/json': {
          schema: z.object({
            cancelled: z.boolean(),
            id: z.string().uuid(),
            reservationCode: z.string(),
            restoredQuantity: z.number().int(),
          }),
        },
      },
    },
  },
});

adminRouter.openapi(cancelAdminReservationRoute, async (c) => {
  const db = c.get('db');
  const tenant = c.get('tenant')!;
  const { reservationId } = c.req.valid('param');
  const result = await cancelReservation(db, { tenantId: tenant.id, reservationId });
  return c.json(result);
});

export { adminRouter };
