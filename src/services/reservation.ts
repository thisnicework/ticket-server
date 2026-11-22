import { and, asc, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import {
  events,
  reservationItems,
  reservations,
  schedules,
  ticketTypes,
} from '../db/schema.js';
import { generateReservationCode } from '../utils/crypto.js';
import { AppError } from '../utils/errors.js';
import { normalizeName, normalizePhone } from '../utils/phone.js';

export interface CreateReservationInput {
  tenantId: string;
  scheduleId: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    ticketTypeId: string;
    quantity: number;
  }>;
  metadata?: Record<string, unknown>;
}

export interface LookupReservationInput {
  tenantId: string;
  customerPhone: string;
  customerName?: string;
  reservationCode?: string;
}

/**
 * 동일 ticketTypeId가 중복 전달된 경우 수량을 합산하고,
 * 데드락 방지를 위해 ticketTypeId 오름차순으로 정렬합니다.
 */
export function mergeAndSortItems(
  items: Array<{ ticketTypeId: string; quantity: number }>,
): Array<{ ticketTypeId: string; quantity: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.ticketTypeId, (map.get(item.ticketTypeId) ?? 0) + item.quantity);
  }
  return Array.from(map.entries())
    .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))
    .sort((a, b) => a.ticketTypeId.localeCompare(b.ticketTypeId));
}

export async function createReservation(db: Database, input: CreateReservationInput) {
  const customerName = normalizeName(input.customerName);
  const customerPhone = normalizePhone(input.customerPhone);

  if (customerName.length === 0) {
    throw new AppError(400, 'INVALID_CUSTOMER_NAME', '예매자 이름을 입력해 주세요.');
  }
  if (customerPhone.length < 8) {
    throw new AppError(400, 'INVALID_CUSTOMER_PHONE', '올바른 연락처를 입력해 주세요.');
  }

  const normalizedItems = mergeAndSortItems(input.items);
  if (normalizedItems.length === 0) {
    throw new AppError(400, 'EMPTY_ITEMS', '최소 1개 이상의 티켓을 선택해야 합니다.');
  }

  return await db.transaction(async (tx) => {
    // 1. 회차 및 행사 활성 상태 + 예매 기간 검증
    const scheduleRows = await tx
      .select({
        schedule: schedules,
        event: events,
      })
      .from(schedules)
      .innerJoin(events, eq(schedules.eventId, events.id))
      .where(
        and(
          eq(schedules.id, input.scheduleId),
          eq(schedules.tenantId, input.tenantId),
          eq(events.tenantId, input.tenantId),
        ),
      )
      .limit(1);

    const scheduleRecord = scheduleRows[0];
    if (!scheduleRecord) {
      throw new AppError(404, 'SCHEDULE_NOT_FOUND', '해당 회차를 찾을 수 없습니다.');
    }
    if (!scheduleRecord.event.isActive || !scheduleRecord.schedule.isActive) {
      throw new AppError(400, 'SALES_CLOSED', '현재 예매가 비활성화된 행사 또는 회차입니다.');
    }

    const now = new Date();
    if (scheduleRecord.schedule.salesOpenAt && now < scheduleRecord.schedule.salesOpenAt) {
      throw new AppError(400, 'SALES_NOT_OPEN', '아직 예매 오픈 시간이 아닙니다.');
    }
    if (scheduleRecord.schedule.salesCloseAt && now > scheduleRecord.schedule.salesCloseAt) {
      throw new AppError(400, 'SALES_CLOSED', '예매가 마감되었습니다.');
    }

    // 2. 원자적 재고 차감 (ticketTypeId 오름차순으로 업데이트하여 데드락 방지)
    const reservedLines: Array<{
      ticketTypeId: string;
      ticketTypeName: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    let totalQuantity = 0;
    let totalAmount = 0;

    for (const item of normalizedItems) {
      const updatedRows = await tx
        .update(ticketTypes)
        .set({
          remainingQuantity: sql`${ticketTypes.remainingQuantity} - ${item.quantity}`,
          updatedAt: now,
        })
        .where(
          and(
            eq(ticketTypes.id, item.ticketTypeId),
            eq(ticketTypes.tenantId, input.tenantId),
            eq(ticketTypes.scheduleId, input.scheduleId),
            gte(ticketTypes.remainingQuantity, item.quantity),
          ),
        )
        .returning();

      const updated = updatedRows[0];
      if (!updated) {
        // 정확한 실패 사유 확인 (존재하지 않음 vs 잔여 수량 부족)
        const existingRows = await tx
          .select()
          .from(ticketTypes)
          .where(
            and(
              eq(ticketTypes.id, item.ticketTypeId),
              eq(ticketTypes.tenantId, input.tenantId),
              eq(ticketTypes.scheduleId, input.scheduleId),
            ),
          )
          .limit(1);

        const existing = existingRows[0];
        if (!existing) {
          throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', '선택한 티켓 권종을 찾을 수 없습니다.', {
            ticketTypeId: item.ticketTypeId,
          });
        }
        if (existing.maxPerReservation !== null && item.quantity > existing.maxPerReservation) {
          throw new AppError(
            400,
            'EXCEEDS_MAX_PER_RESERVATION',
            `'${existing.name}'은(는) 1회 최대 ${existing.maxPerReservation}매까지 예매 가능합니다.`,
            {
              ticketTypeId: existing.id,
              maxPerReservation: existing.maxPerReservation,
            },
          );
        }
        throw new AppError(409, 'INSUFFICIENT_QUANTITY', `'${existing.name}' 잔여 수량이 부족합니다.`, {
          ticketTypeId: existing.id,
          requested: item.quantity,
          remaining: existing.remainingQuantity,
        });
      }

      if (updated.maxPerReservation !== null && item.quantity > updated.maxPerReservation) {
        throw new AppError(
          400,
          'EXCEEDS_MAX_PER_RESERVATION',
          `'${updated.name}'은(는) 1회 최대 ${updated.maxPerReservation}매까지 예매 가능합니다.`,
          {
            ticketTypeId: updated.id,
            maxPerReservation: updated.maxPerReservation,
          },
        );
      }

      totalQuantity += item.quantity;
      totalAmount += updated.price * item.quantity;
      reservedLines.push({
        ticketTypeId: updated.id,
        ticketTypeName: updated.name,
        quantity: item.quantity,
        unitPrice: updated.price,
      });
    }

    // 3. 예매 레코드 생성
    const reservationCode = generateReservationCode();
    const [createdReservation] = await tx
      .insert(reservations)
      .values({
        tenantId: input.tenantId,
        reservationCode,
        scheduleId: input.scheduleId,
        customerName,
        customerPhone,
        totalQuantity,
        totalAmount,
        metadata: input.metadata ?? {},
      })
      .returning();

    // 4. 예매 상세 아이템 생성
    await tx.insert(reservationItems).values(
      reservedLines.map((line) => ({
        tenantId: input.tenantId,
        reservationId: createdReservation.id,
        ticketTypeId: line.ticketTypeId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    );

    return {
      id: createdReservation.id,
      reservationCode: createdReservation.reservationCode,
      scheduleId: createdReservation.scheduleId,
      event: {
        id: scheduleRecord.event.id,
        title: scheduleRecord.event.title,
        venue: scheduleRecord.event.venue,
      },
      schedule: {
        id: scheduleRecord.schedule.id,
        startsAt: scheduleRecord.schedule.startsAt.toISOString(),
        endsAt: scheduleRecord.schedule.endsAt?.toISOString() ?? null,
      },
      customerName: createdReservation.customerName,
      customerPhone: createdReservation.customerPhone,
      totalQuantity: createdReservation.totalQuantity,
      totalAmount: createdReservation.totalAmount,
      metadata: createdReservation.metadata,
      items: reservedLines,
      createdAt: createdReservation.createdAt.toISOString(),
    };
  });
}

export async function lookupReservations(db: Database, input: LookupReservationInput) {
  const customerPhone = normalizePhone(input.customerPhone);
  if (customerPhone.length < 8) {
    throw new AppError(400, 'INVALID_CUSTOMER_PHONE', '올바른 연락처를 입력해 주세요.');
  }

  const conditions = [
    eq(reservations.tenantId, input.tenantId),
    eq(reservations.customerPhone, customerPhone),
  ];

  const normalizedCode = input.reservationCode?.trim().toUpperCase();
  const normalizedCustomerName = input.customerName ? normalizeName(input.customerName) : undefined;

  if (!normalizedCode && !normalizedCustomerName) {
    throw new AppError(
      400,
      'LOOKUP_CONDITION_REQUIRED',
      '예매 조회를 위해 이름(customerName) 또는 예매번호(reservationCode)를 함께 입력해 주세요.',
    );
  }

  if (normalizedCode) {
    conditions.push(eq(reservations.reservationCode, normalizedCode));
  }
  if (normalizedCustomerName) {
    conditions.push(eq(reservations.customerName, normalizedCustomerName));
  }

  const rows = await db
    .select({
      reservation: reservations,
      schedule: schedules,
      event: events,
    })
    .from(reservations)
    .innerJoin(schedules, eq(reservations.scheduleId, schedules.id))
    .innerJoin(events, eq(schedules.eventId, events.id))
    .where(and(...conditions))
    .orderBy(desc(reservations.createdAt));

  if (rows.length === 0) {
    return [];
  }

  const reservationIds = rows.map((r) => r.reservation.id);
  const itemRows = await db
    .select({
      item: reservationItems,
      ticketTypeName: ticketTypes.name,
    })
    .from(reservationItems)
    .innerJoin(ticketTypes, eq(reservationItems.ticketTypeId, ticketTypes.id))
    .where(
      and(
        eq(reservationItems.tenantId, input.tenantId),
        inArray(reservationItems.reservationId, reservationIds),
      ),
    );

  const itemsByReservationId = new Map<
    string,
    Array<{
      ticketTypeId: string;
      ticketTypeName: string;
      quantity: number;
      unitPrice: number;
    }>
  >();

  for (const row of itemRows) {
    const list = itemsByReservationId.get(row.item.reservationId) ?? [];
    list.push({
      ticketTypeId: row.item.ticketTypeId,
      ticketTypeName: row.ticketTypeName,
      quantity: row.item.quantity,
      unitPrice: row.item.unitPrice,
    });
    itemsByReservationId.set(row.item.reservationId, list);
  }

  return rows.map(({ reservation, schedule, event }) => ({
    id: reservation.id,
    reservationCode: reservation.reservationCode,
    scheduleId: reservation.scheduleId,
    event: {
      id: event.id,
      title: event.title,
      venue: event.venue,
    },
    schedule: {
      id: schedule.id,
      startsAt: schedule.startsAt.toISOString(),
      endsAt: schedule.endsAt?.toISOString() ?? null,
    },
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone,
    totalQuantity: reservation.totalQuantity,
    totalAmount: reservation.totalAmount,
    metadata: reservation.metadata,
    items: itemsByReservationId.get(reservation.id) ?? [],
    createdAt: reservation.createdAt.toISOString(),
  }));
}

export async function cancelReservation(
  db: Database,
  input: { tenantId: string; reservationId: string },
) {
  return await db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(reservations)
      .where(
        and(eq(reservations.id, input.reservationId), eq(reservations.tenantId, input.tenantId)),
      )
      .limit(1);

    const reservation = existingRows[0];
    if (!reservation) {
      throw new AppError(404, 'RESERVATION_NOT_FOUND', '취소할 예매 내역을 찾을 수 없습니다.');
    }

    const items = await tx
      .select()
      .from(reservationItems)
      .where(
        and(
          eq(reservationItems.tenantId, input.tenantId),
          eq(reservationItems.reservationId, reservation.id),
        ),
      )
      .orderBy(asc(reservationItems.ticketTypeId));

    const now = new Date();
    for (const item of items) {
      await tx
        .update(ticketTypes)
        .set({
          remainingQuantity: sql`LEAST(${ticketTypes.totalQuantity}, ${ticketTypes.remainingQuantity} + ${item.quantity})`,
          updatedAt: now,
        })
        .where(
          and(eq(ticketTypes.id, item.ticketTypeId), eq(ticketTypes.tenantId, input.tenantId)),
        );
    }

    await tx
      .delete(reservations)
      .where(and(eq(reservations.id, reservation.id), eq(reservations.tenantId, input.tenantId)));

    return {
      cancelled: true,
      id: reservation.id,
      reservationCode: reservation.reservationCode,
      restoredQuantity: reservation.totalQuantity,
    };
  });
}
