import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTicketingClient, TicketingApiError } from '../sdk/index.js';
import { createApp } from '../src/app.js';
import type { Database } from '../src/db/index.js';
import * as schema from '../src/db/schema.js';

const MASTER_KEY = 'integration-test-master-key-123456';

describe('Full Reservation E2E Integration Tests (Real PostgreSQL via PGlite)', () => {
  let pg: PGlite;
  let app: ReturnType<typeof createApp>;

  // 공유 테스트 픽스처 ID
  let tenantAId: string;
  let tenantAPubKey: string;
  let tenantAAdminKey: string;
  let tenantBId: string;
  let tenantBPubKey: string;

  let eventAId: string;
  let openScheduleId: string;
  let futureScheduleId: string;
  let closedScheduleId: string;
  let regularTicketId: string;
  let vipTicketId: string;
  let limitedTicketId: string;

  const platformHeaders = {
    Authorization: `Bearer ${MASTER_KEY}`,
    'Content-Type': 'application/json',
  };

  async function reqJson<T = any>(path: string, init?: RequestInit) {
    const res = await app.request(path, init);
    const body = (await res.json().catch(() => null)) as T;
    return { status: res.status, body, headers: res.headers };
  }

  beforeAll(async () => {
    pg = new PGlite();
    const migrationSql = readFileSync(
      resolve(process.cwd(), 'drizzle/0000_loose_harry_osborn.sql'),
      'utf8',
    );
    // drizzle-kit statement-breakpoint 구분자로 분할 실행
    const statements = migrationSql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await pg.exec(stmt);
    }

    const db = drizzle(pg, { schema }) as unknown as Database;
    app = createApp({
      db,
      platformMasterKey: MASTER_KEY,
      enableLogger: false,
    });
  });

  afterAll(async () => {
    await pg.close();
  });

  it('1. 테넌트 2개 등록 및 Public/Admin API Key 발급 + Origin/권한 격리 검증', async () => {
    const tA = await reqJson('/v1/platform/tenants', {
      method: 'POST',
      headers: platformHeaders,
      body: JSON.stringify({
        slug: 'musical-a',
        name: '창작뮤지컬 A 사이트',
        allowedOrigins: ['https://musical-a.example.com'],
      }),
    });
    expect(tA.status).toBe(201);
    tenantAId = tA.body.id;

    const tB = await reqJson('/v1/platform/tenants', {
      method: 'POST',
      headers: platformHeaders,
      body: JSON.stringify({
        slug: 'musical-b',
        name: '공연 B 사이트',
        allowedOrigins: [],
      }),
    });
    expect(tB.status).toBe(201);
    tenantBId = tB.body.id;

    // 키 발급
    const kAPub = await reqJson(`/v1/platform/tenants/${tenantAId}/api-keys`, {
      method: 'POST',
      headers: platformHeaders,
      body: JSON.stringify({ name: 'A 프론트', scope: 'public' }),
    });
    expect(kAPub.status).toBe(201);
    expect(kAPub.body.apiKey.startsWith('pk_live_')).toBe(true);
    tenantAPubKey = kAPub.body.apiKey;

    const kAAdmin = await reqJson(`/v1/platform/tenants/${tenantAId}/api-keys`, {
      method: 'POST',
      headers: platformHeaders,
      body: JSON.stringify({ name: 'A 어드민', scope: 'admin' }),
    });
    expect(kAAdmin.status).toBe(201);
    tenantAAdminKey = kAAdmin.body.apiKey;

    const kBPub = await reqJson(`/v1/platform/tenants/${tenantBId}/api-keys`, {
      method: 'POST',
      headers: platformHeaders,
      body: JSON.stringify({ name: 'B 프론트', scope: 'public' }),
    });
    expect(kBPub.status).toBe(201);
    tenantBPubKey = kBPub.body.apiKey;

    // 허용되지 않은 Origin 차단 검증
    const badOrigin = await reqJson('/v1/events', {
      headers: {
        'X-API-Key': tenantAPubKey,
        Origin: 'https://evil-site.example.com',
      },
    });
    expect(badOrigin.status).toBe(403);
    expect(badOrigin.body.error.code).toBe('ORIGIN_NOT_ALLOWED');

    // Public 키로 Admin API 접근 차단 검증
    const badScope = await reqJson('/v1/admin/events', {
      headers: { 'X-API-Key': tenantAPubKey },
    });
    expect(badScope.status).toBe(403);
    expect(badScope.body.error.code).toBe('INSUFFICIENT_SCOPE');
  });

  it('2. 행사 → 회차(오픈됨 / 오픈 예정 / 마감됨) → 수량 권종 등록 및 Public 조회', async () => {
    const evRes = await reqJson(`/v1/platform/tenants/${tenantAId}/events`, {
      method: 'POST',
      headers: platformHeaders,
      body: JSON.stringify({
        title: '창작뮤지컬 <다이노즈>',
        venue: '대학로 소극장',
        description: '테스트 공연',
      }),
    });
    expect(evRes.status).toBe(201);
    eventAId = evRes.body.id;

    const now = Date.now();
    const hour = 60 * 60 * 1000;

    // 회차 1: 현재 예매 가능
    const scOpen = await reqJson(`/v1/platform/tenants/${tenantAId}/events/${eventAId}/schedules`, {
      method: 'POST',
      headers: platformHeaders,
      body: JSON.stringify({
        startsAt: new Date(now + 48 * hour).toISOString(),
        salesOpenAt: new Date(now - 2 * hour).toISOString(),
        salesCloseAt: new Date(now + 24 * hour).toISOString(),
      }),
    });
    expect(scOpen.status).toBe(201);
    openScheduleId = scOpen.body.id;

    // 회차 2: 아직 예매 오픈 전 (1시간 뒤 오픈)
    const scFuture = await reqJson(`/v1/platform/tenants/${tenantAId}/events/${eventAId}/schedules`, {
      method: 'POST',
      headers: platformHeaders,
      body: JSON.stringify({
        startsAt: new Date(now + 72 * hour).toISOString(),
        salesOpenAt: new Date(now + 1 * hour).toISOString(),
      }),
    });
    expect(scFuture.status).toBe(201);
    futureScheduleId = scFuture.body.id;

    // 회차 3: 예매 마감됨 (1시간 전 마감)
    const scClosed = await reqJson(`/v1/platform/tenants/${tenantAId}/events/${eventAId}/schedules`, {
      method: 'POST',
      headers: platformHeaders,
      body: JSON.stringify({
        startsAt: new Date(now + 96 * hour).toISOString(),
        salesCloseAt: new Date(now - 1 * hour).toISOString(),
      }),
    });
    expect(scClosed.status).toBe(201);
    closedScheduleId = scClosed.body.id;

    // 오픈 회차 권종 3개 등록
    const ttReg = await reqJson(
      `/v1/platform/tenants/${tenantAId}/schedules/${openScheduleId}/ticket-types`,
      {
        method: 'POST',
        headers: platformHeaders,
        body: JSON.stringify({ name: '일반석', price: 0, totalQuantity: 10, maxPerReservation: 2 }),
      },
    );
    expect(ttReg.status).toBe(201);
    regularTicketId = ttReg.body.id;

    const ttVip = await reqJson(
      `/v1/platform/tenants/${tenantAId}/schedules/${openScheduleId}/ticket-types`,
      {
        method: 'POST',
        headers: platformHeaders,
        body: JSON.stringify({ name: 'VIP석', price: 20000, totalQuantity: 3, maxPerReservation: 2 }),
      },
    );
    expect(ttVip.status).toBe(201);
    vipTicketId = ttVip.body.id;

    const ttLim = await reqJson(
      `/v1/platform/tenants/${tenantAId}/schedules/${openScheduleId}/ticket-types`,
      {
        method: 'POST',
        headers: platformHeaders,
        body: JSON.stringify({ name: '선착순 5매', price: 0, totalQuantity: 5, maxPerReservation: 1 }),
      },
    );
    expect(ttLim.status).toBe(201);
    limitedTicketId = ttLim.body.id;

    // 오픈 예정 / 마감 회차에도 권종 1개씩 등록
    await reqJson(`/v1/platform/tenants/${tenantAId}/schedules/${futureScheduleId}/ticket-types`, {
      method: 'POST',
      headers: platformHeaders,
      body: JSON.stringify({ name: '일반석', price: 0, totalQuantity: 50 }),
    });
    await reqJson(`/v1/platform/tenants/${tenantAId}/schedules/${closedScheduleId}/ticket-types`, {
      method: 'POST',
      headers: platformHeaders,
      body: JSON.stringify({ name: '일반석', price: 0, totalQuantity: 50 }),
    });

    // Public 상세 조회
    const detail = await reqJson(`/v1/events/${eventAId}`, {
      headers: { 'X-API-Key': tenantAPubKey },
    });
    expect(detail.status).toBe(200);
    expect(detail.body.title).toBe('창작뮤지컬 <다이노즈>');
    expect(detail.body.schedules).toHaveLength(3);
    expect(detail.body.schedules[0].ticketTypes).toHaveLength(3);
  });

  it('3. 회차별 예매 오픈 전(SALES_NOT_OPEN) 및 마감 후(SALES_CLOSED) 자동 차단', async () => {
    const detail = await reqJson(`/v1/events/${eventAId}`, {
      headers: { 'X-API-Key': tenantAPubKey },
    });
    const futureTtId = detail.body.schedules.find((s: any) => s.id === futureScheduleId).ticketTypes[0].id;
    const closedTtId = detail.body.schedules.find((s: any) => s.id === closedScheduleId).ticketTypes[0].id;

    const rFuture = await reqJson('/v1/reservations', {
      method: 'POST',
      headers: { 'X-API-Key': tenantAPubKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleId: futureScheduleId,
        customerName: '김오픈전',
        customerPhone: '010-1111-2222',
        items: [{ ticketTypeId: futureTtId, quantity: 1 }],
      }),
    });
    expect(rFuture.status).toBe(400);
    expect(rFuture.body.error.code).toBe('SALES_NOT_OPEN');

    const rClosed = await reqJson('/v1/reservations', {
      method: 'POST',
      headers: { 'X-API-Key': tenantAPubKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleId: closedScheduleId,
        customerName: '김마감',
        customerPhone: '010-1111-3333',
        items: [{ ticketTypeId: closedTtId, quantity: 1 }],
      }),
    });
    expect(rClosed.status).toBe(400);
    expect(rClosed.body.error.code).toBe('SALES_CLOSED');
  });

  it('4. 비회원 수량제 예매 성공, 1회 최대 매수 제한(중복 ID 합산 포함), 부분 실패 시 전체 롤백 검증', async () => {
    // 4-1. maxPerReservation = 2인데 동일 ticketTypeId를 2+1로 쪼개서 우회 시도 -> 차단!
    const bypassAttempt = await reqJson('/v1/reservations', {
      method: 'POST',
      headers: { 'X-API-Key': tenantAPubKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleId: openScheduleId,
        customerName: '우회시도',
        customerPhone: '010-2222-3333',
        items: [
          { ticketTypeId: regularTicketId, quantity: 2 },
          { ticketTypeId: regularTicketId, quantity: 1 },
        ],
      }),
    });
    expect(bypassAttempt.status).toBe(400);
    expect(bypassAttempt.body.error.code).toBe('EXCEEDS_MAX_PER_RESERVATION');

    // 4-2. 정상 예매 (일반석 2매 + VIP 2매)
    const okRes = await reqJson('/v1/reservations', {
      method: 'POST',
      headers: { 'X-API-Key': tenantAPubKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleId: openScheduleId,
        customerName: '  홍   길동 ',
        customerPhone: '010-1234-5678',
        items: [
          { ticketTypeId: regularTicketId, quantity: 2 },
          { ticketTypeId: vipTicketId, quantity: 2 },
        ],
      }),
    });
    expect(okRes.status).toBe(201);
    expect(okRes.body.reservationCode).toMatch(/^RSV-/);
    expect(okRes.body.customerName).toBe('홍 길동');
    expect(okRes.body.customerPhone).toBe('01012345678');
    expect(okRes.body.totalQuantity).toBe(4);
    expect(okRes.body.totalAmount).toBe(40000);

    // 4-3. 트랜잭션 원자성 검증: 일반석은 8매 남았지만 VIP석은 1매만 남은 상태에서 [일반석 2매 + VIP 2매] 요청 -> 409 및 일반석 8매 유지!
    const partialFail = await reqJson('/v1/reservations', {
      method: 'POST',
      headers: { 'X-API-Key': tenantAPubKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleId: openScheduleId,
        customerName: '롤백테스트',
        customerPhone: '010-3333-4444',
        items: [
          { ticketTypeId: regularTicketId, quantity: 2 },
          { ticketTypeId: vipTicketId, quantity: 2 },
        ],
      }),
    });
    expect(partialFail.status).toBe(409);
    expect(partialFail.body.error.code).toBe('INSUFFICIENT_QUANTITY');

    // 일반석 재고가 8매 그대로 원복되어 있는지 확인
    const afterDetail = await reqJson(`/v1/events/${eventAId}`, {
      headers: { 'X-API-Key': tenantAPubKey },
    });
    const openSc = afterDetail.body.schedules.find((s: any) => s.id === openScheduleId);
    const regTt = openSc.ticketTypes.find((t: any) => t.id === regularTicketId);
    const vipTt = openSc.ticketTypes.find((t: any) => t.id === vipTicketId);
    expect(regTt.remainingQuantity).toBe(8);
    expect(vipTt.remainingQuantity).toBe(1);

    // 4-4. 재고가 1매 남았을 때 maxPerReservation(2)을 초과한 3매 요청 시 EXCEEDS_MAX_PER_RESERVATION 반환 확인
    const overMaxWhenLowStock = await reqJson('/v1/reservations', {
      method: 'POST',
      headers: { 'X-API-Key': tenantAPubKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleId: openScheduleId,
        customerName: '최대초과',
        customerPhone: '010-4444-5555',
        items: [{ ticketTypeId: vipTicketId, quantity: 3 }],
      }),
    });
    expect(overMaxWhenLowStock.status).toBe(400);
    expect(overMaxWhenLowStock.body.error.code).toBe('EXCEEDS_MAX_PER_RESERVATION');
  });

  it('5. 동시성 테스트: 잔여 5매 권종에 10명 동시 예매 시 정확히 5명만 성공하고 잔여 0매', async () => {
    const requests = Array.from({ length: 10 }, (_, idx) =>
      reqJson('/v1/reservations', {
        method: 'POST',
        headers: { 'X-API-Key': tenantAPubKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: openScheduleId,
          customerName: `선착순${idx + 1}`,
          customerPhone: `010-9000-${String(1000 + idx)}`,
          items: [{ ticketTypeId: limitedTicketId, quantity: 1 }],
        }),
      }),
    );

    const results = await Promise.all(requests);
    const succeeded = results.filter((r) => r.status === 201);
    const conflicted = results.filter(
      (r) => r.status === 409 && r.body.error.code === 'INSUFFICIENT_QUANTITY',
    );

    expect(succeeded).toHaveLength(5);
    expect(conflicted).toHaveLength(5);

    const afterDetail = await reqJson(`/v1/events/${eventAId}`, {
      headers: { 'X-API-Key': tenantAPubKey },
    });
    const openSc = afterDetail.body.schedules.find((s: any) => s.id === openScheduleId);
    const limTt = openSc.ticketTypes.find((t: any) => t.id === limitedTicketId);
    expect(limTt.remainingQuantity).toBe(0);
  });

  it('6. 비회원 예매 조회(이름+연락처 / 예매번호+연락처 / 다양한 전화번호 형식) 및 취소 불가 검증', async () => {
    // 하이픈 제거 & +82 국제번호 형식 모두 조회 성공
    const byName = await reqJson('/v1/reservations/lookup', {
      method: 'POST',
      headers: { 'X-API-Key': tenantAPubKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: '홍 길동',
        customerPhone: '+82 10 1234 5678',
      }),
    });
    expect(byName.status).toBe(200);
    expect(byName.body.reservations).toHaveLength(1);
    const code = byName.body.reservations[0].reservationCode as string;

    // 소문자 예매번호 + 연락처로 조회 성공
    const byCode = await reqJson('/v1/reservations/lookup', {
      method: 'POST',
      headers: { 'X-API-Key': tenantAPubKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationCode: code.toLowerCase(),
        customerPhone: '01012345678',
      }),
    });
    expect(byCode.status).toBe(200);
    expect(byCode.body.reservations).toHaveLength(1);

    // 틀린 이름이면 조회 불가
    const wrongName = await reqJson('/v1/reservations/lookup', {
      method: 'POST',
      headers: { 'X-API-Key': tenantAPubKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: '다른사람',
        customerPhone: '010-1234-5678',
      }),
    });
    expect(wrongName.status).toBe(200);
    expect(wrongName.body.reservations).toHaveLength(0);

    // 취소 엔드포인트가 존재하지 않음을 검증
    const cancelAttempt = await reqJson(`/v1/reservations/${byName.body.reservations[0].id}/cancel`, {
      method: 'POST',
      headers: { 'X-API-Key': tenantAPubKey },
    });
    expect(cancelAttempt.status).toBe(404);
  });

  it('7. 멀티테넌트 데이터 완전 격리 검증 (Tenant B는 Tenant A 데이터 접근 불가)', async () => {
    const bList = await reqJson('/v1/events', {
      headers: { 'X-API-Key': tenantBPubKey },
    });
    expect(bList.status).toBe(200);
    expect(bList.body.events).toHaveLength(0);

    const bDetail = await reqJson(`/v1/events/${eventAId}`, {
      headers: { 'X-API-Key': tenantBPubKey },
    });
    expect(bDetail.status).toBe(404);

    const bReserve = await reqJson('/v1/reservations', {
      method: 'POST',
      headers: { 'X-API-Key': tenantBPubKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleId: openScheduleId,
        customerName: '타테넌트',
        customerPhone: '010-1234-5678',
        items: [{ ticketTypeId: regularTicketId, quantity: 1 }],
      }),
    });
    expect(bReserve.status).toBe(404);

    const bLookup = await reqJson('/v1/reservations/lookup', {
      method: 'POST',
      headers: { 'X-API-Key': tenantBPubKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: '홍 길동',
        customerPhone: '010-1234-5678',
      }),
    });
    expect(bLookup.status).toBe(200);
    expect(bLookup.body.reservations).toHaveLength(0);
  });

  it('8. 어드민 수량 조정, 예매 있는 회차/권종 삭제 보호, 빈 회차/권종 삭제, SDK 실연동 검증', async () => {
    // 8-1. 이미 예매 내역이 있는 회차 삭제 시도 -> 409 보호
    const delUsedSchedule = await reqJson(
      `/v1/platform/tenants/${tenantAId}/schedules/${openScheduleId}`,
      { method: 'DELETE', headers: platformHeaders },
    );
    expect(delUsedSchedule.status).toBe(409);
    expect(delUsedSchedule.body.error.code).toBe('SCHEDULE_HAS_RESERVATIONS');

    // 8-2. 이미 예매 내역이 있는 권종 삭제 시도 -> 409 보호
    const delUsedTt = await reqJson(
      `/v1/platform/tenants/${tenantAId}/ticket-types/${regularTicketId}`,
      { method: 'DELETE', headers: platformHeaders },
    );
    expect(delUsedTt.status).toBe(409);
    expect(delUsedTt.body.error.code).toBe('TICKET_TYPE_HAS_RESERVATIONS');

    // 8-3. 예매 내역이 없는 회차 삭제 -> 200 성공
    const delEmptySchedule = await reqJson(
      `/v1/platform/tenants/${tenantAId}/schedules/${closedScheduleId}`,
      { method: 'DELETE', headers: platformHeaders },
    );
    expect(delEmptySchedule.status).toBe(200);
    expect(delEmptySchedule.body.deleted).toBe(true);

    // 8-4. 권종 총 수량 수정: 기예매(2매) 미만으로 축소 시 400, 15매로 증설 시 잔여 13매 자동 계산
    const shrinkTooMuch = await reqJson(
      `/v1/platform/tenants/${tenantAId}/ticket-types/${regularTicketId}`,
      {
        method: 'PATCH',
        headers: platformHeaders,
        body: JSON.stringify({ totalQuantity: 1 }),
      },
    );
    expect(shrinkTooMuch.status).toBe(400);

    const expandQty = await reqJson(
      `/v1/platform/tenants/${tenantAId}/ticket-types/${regularTicketId}`,
      {
        method: 'PATCH',
        headers: platformHeaders,
        body: JSON.stringify({ totalQuantity: 15 }),
      },
    );
    expect(expandQty.status).toBe(200);
    expect(expandQty.body.totalQuantity).toBe(15);
    expect(expandQty.body.remainingQuantity).toBe(13);

    // 8-5. SDK(sdk/index.ts)를 통한 전체 예매 및 조회 플로우 검증
    const sdk = createTicketingClient({
      baseUrl: 'http://localhost',
      apiKey: tenantAPubKey,
      fetchImpl: (input, init) => {
        const url = typeof input === 'string' ? input : input.toString();
        const path = url.replace(/^http:\/\/localhost/, '');
        return Promise.resolve(app.request(path, init));
      },
    });

    const { events } = await sdk.events.list();
    expect(events).toHaveLength(1);

    const sdkCreated = await sdk.reservations.create({
      scheduleId: openScheduleId,
      customerName: 'SDK예매자',
      customerPhone: '010-7777-8888',
      items: [{ ticketTypeId: regularTicketId, quantity: 1 }],
    });
    expect(sdkCreated.reservationCode).toMatch(/^RSV-/);

    const sdkFound = await sdk.reservations.lookup({
      customerName: 'SDK예매자',
      customerPhone: '01077778888',
    });
    expect(sdkFound.reservations).toHaveLength(1);
    expect(sdkFound.reservations[0].reservationCode).toBe(sdkCreated.reservationCode);

    // SDK 에러 래핑(TicketingApiError) 검증 (매진된 선착순 권종 요청)
    await expect(
      sdk.reservations.create({
        scheduleId: openScheduleId,
        customerName: '매진테스트',
        customerPhone: '010-0000-1111',
        items: [{ ticketTypeId: limitedTicketId, quantity: 1 }],
      }),
    ).rejects.toThrow(TicketingApiError);

    // 8-6. Admin 키로 예매자 명단 조회 검증 (총 1 + 5 + 1 = 7건)
    const adminList = await reqJson('/v1/admin/reservations', {
      headers: { Authorization: `Bearer ${tenantAAdminKey}` },
    });
    expect(adminList.status).toBe(200);
    expect(adminList.body.reservations).toHaveLength(7);

    // 8-7. 관리자 예매 취소 -> 예매 내역 삭제 및 잔여 수량 자동 복구 검증
    const cancelRes = await reqJson(
      `/v1/platform/tenants/${tenantAId}/reservations/${sdkCreated.id}`,
      { method: 'DELETE', headers: platformHeaders },
    );
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.cancelled).toBe(true);
    expect(cancelRes.body.restoredQuantity).toBe(1);

    // 잔여 수량이 12 -> 13으로 정확히 복구되었는지 & 비회원 조회에서 사라졌는지 확인
    const afterCancelDetail = await reqJson(`/v1/events/${eventAId}`, {
      headers: { 'X-API-Key': tenantAPubKey },
    });
    const afterCancelReg = afterCancelDetail.body.schedules
      .find((s: any) => s.id === openScheduleId)
      .ticketTypes.find((t: any) => t.id === regularTicketId);
    expect(afterCancelReg.remainingQuantity).toBe(13);

    const afterCancelLookup = await sdk.reservations.lookup({
      customerName: 'SDK예매자',
      customerPhone: '01077778888',
    });
    expect(afterCancelLookup.reservations).toHaveLength(0);

    // 8-8. 어드민 대시보드 초기 로딩 3개 API(overview / api-keys / reservations) 모두 200 정상 반환 검증
    const [ov, ks, rs] = await Promise.all([
      reqJson(`/v1/platform/tenants/${tenantAId}/overview`, { headers: platformHeaders }),
      reqJson(`/v1/platform/tenants/${tenantAId}/api-keys`, { headers: platformHeaders }),
      reqJson(`/v1/platform/tenants/${tenantAId}/reservations`, { headers: platformHeaders }),
    ]);
    expect(ov.status).toBe(200);
    expect(ov.body.events).toHaveLength(1);
    expect(ov.body.stats.reservationCount).toBe(6);
    expect(ks.status).toBe(200);
    expect(ks.body.apiKeys.length).toBeGreaterThanOrEqual(2);
    expect(rs.status).toBe(200);
    expect(rs.body.reservations).toHaveLength(6);
  });
});
