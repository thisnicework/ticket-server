import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    allowedOrigins: text('allowed_origins')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('tenants_slug_uidx').on(table.slug)],
);

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    keyHash: text('key_hash').notNull(),
    scope: text('scope', { enum: ['public', 'admin'] }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('api_keys_key_hash_uidx').on(table.keyHash),
    index('api_keys_tenant_idx').on(table.tenantId),
  ],
);

export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    venue: text('venue'),
    posterUrl: text('poster_url'),
    isActive: boolean('is_active').notNull().default(true),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('events_tenant_active_idx').on(table.tenantId, table.isActive)],
);

export const schedules = pgTable(
  'schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    salesOpenAt: timestamp('sales_open_at', { withTimezone: true }),
    salesCloseAt: timestamp('sales_close_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('schedules_tenant_event_idx').on(table.tenantId, table.eventId),
    index('schedules_tenant_starts_idx').on(table.tenantId, table.startsAt),
  ],
);

export const ticketTypes = pgTable(
  'ticket_types',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => schedules.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    price: integer('price').notNull().default(0),
    totalQuantity: integer('total_quantity').notNull(),
    remainingQuantity: integer('remaining_quantity').notNull(),
    maxPerReservation: integer('max_per_reservation'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ticket_types_tenant_schedule_idx').on(table.tenantId, table.scheduleId),
    check('ticket_types_price_non_negative', sql`${table.price} >= 0`),
    check('ticket_types_total_qty_non_negative', sql`${table.totalQuantity} >= 0`),
    check('ticket_types_remaining_qty_valid', sql`${table.remainingQuantity} >= 0 AND ${table.remainingQuantity} <= ${table.totalQuantity}`),
    check(
      'ticket_types_max_per_res_valid',
      sql`${table.maxPerReservation} IS NULL OR ${table.maxPerReservation} > 0`,
    ),
  ],
);

export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    reservationCode: text('reservation_code').notNull(),
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => schedules.id, { onDelete: 'restrict' }),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    totalQuantity: integer('total_quantity').notNull(),
    totalAmount: integer('total_amount').notNull().default(0),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('reservations_tenant_code_uidx').on(table.tenantId, table.reservationCode),
    index('reservations_tenant_phone_name_idx').on(
      table.tenantId,
      table.customerPhone,
      table.customerName,
    ),
    index('reservations_tenant_schedule_idx').on(table.tenantId, table.scheduleId),
    check('reservations_total_qty_positive', sql`${table.totalQuantity} > 0`),
    check('reservations_total_amount_non_negative', sql`${table.totalAmount} >= 0`),
  ],
);

export const reservationItems = pgTable(
  'reservation_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    ticketTypeId: uuid('ticket_type_id')
      .notNull()
      .references(() => ticketTypes.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    unitPrice: integer('unit_price').notNull().default(0),
  },
  (table) => [
    index('reservation_items_tenant_reservation_idx').on(table.tenantId, table.reservationId),
    check('reservation_items_qty_positive', sql`${table.quantity} > 0`),
    check('reservation_items_unit_price_non_negative', sql`${table.unitPrice} >= 0`),
  ],
);

export type Tenant = typeof tenants.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type TicketType = typeof ticketTypes.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type ReservationItem = typeof reservationItems.$inferSelect;
