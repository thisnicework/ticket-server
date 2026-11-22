import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Database } from '../src/db/index.js';
import { isOriginAllowed } from '../src/middleware/auth.js';
import { mergeAndSortItems } from '../src/services/reservation.js';
import {
  generateApiKey,
  generateReservationCode,
  hashApiKey,
  timingSafeEqualStr,
} from '../src/utils/crypto.js';
import { normalizeName, normalizePhone } from '../src/utils/phone.js';

describe('Utility functions', () => {
  it('normalizes Korean phone numbers consistently', () => {
    expect(normalizePhone('010-1234-5678')).toBe('01012345678');
    expect(normalizePhone('010 1234 5678')).toBe('01012345678');
    expect(normalizePhone('+82 10-1234-5678')).toBe('01012345678');
    expect(normalizePhone('+82 010-1234-5678')).toBe('01012345678');
  });

  it('normalizes customer names by trimming and collapsing spaces', () => {
    expect(normalizeName('  홍길동  ')).toBe('홍길동');
    expect(normalizeName('홍   길동')).toBe('홍 길동');
  });

  it('generates scoped API keys with matching SHA-256 hash', () => {
    const pub = generateApiKey('public');
    expect(pub.rawKey.startsWith('pk_live_')).toBe(true);
    expect(pub.keyHash).toBe(hashApiKey(pub.rawKey));

    const admin = generateApiKey('admin');
    expect(admin.rawKey.startsWith('sk_live_')).toBe(true);
    expect(admin.keyHash).toBe(hashApiKey(admin.rawKey));
  });

  it('generates readable reservation codes', () => {
    const code = generateReservationCode();
    expect(code).toMatch(/^RSV-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
  });

  it('performs constant-time string comparison', () => {
    expect(timingSafeEqualStr('secret-123', 'secret-123')).toBe(true);
    expect(timingSafeEqualStr('secret-123', 'secret-124')).toBe(false);
    expect(timingSafeEqualStr('short', 'much-longer')).toBe(false);
  });

  it('validates allowed origins accurately', () => {
    expect(isOriginAllowed(undefined, ['https://a.com'])).toBe(true);
    expect(isOriginAllowed('https://a.com', [])).toBe(true);
    expect(isOriginAllowed('https://a.com', ['*'])).toBe(true);
    expect(isOriginAllowed('https://a.com', ['https://a.com', 'https://b.com'])).toBe(true);
    expect(isOriginAllowed('https://evil.com', ['https://a.com'])).toBe(false);
  });

  it('merges duplicate ticket types and sorts deterministically to prevent deadlocks', () => {
    const result = mergeAndSortItems([
      { ticketTypeId: 'b-id', quantity: 2 },
      { ticketTypeId: 'a-id', quantity: 1 },
      { ticketTypeId: 'b-id', quantity: 3 },
    ]);
    expect(result).toEqual([
      { ticketTypeId: 'a-id', quantity: 1 },
      { ticketTypeId: 'b-id', quantity: 5 },
    ]);
  });
});

describe('HTTP API Layer', () => {
  const fakeDb = {} as unknown as Database;
  const masterKey = 'test-platform-master-key-123456';
  const app = createApp({
    db: fakeDb,
    platformMasterKey: masterKey,
    enableLogger: false,
  });

  it('responds to GET /health', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('serves valid OpenAPI 3.1 document at /openapi.json', async () => {
    const res = await app.request('/openapi.json');
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.paths['/v1/events']).toBeDefined();
    expect(doc.paths['/v1/reservations']).toBeDefined();
    expect(doc.paths['/v1/reservations/lookup']).toBeDefined();
    expect(doc.paths['/v1/platform/tenants']).toBeDefined();
    expect(doc.paths['/v1/platform/tenants/{tenantId}/overview']).toBeDefined();
    expect(doc.paths['/v1/platform/tenants/{tenantId}/reservations']).toBeDefined();
    expect(doc.paths['/v1/admin/events']).toBeDefined();
  });

  it('serves admin dashboard HTML at GET /admin and favicon at GET /favicon.svg', async () => {
    const res = await app.request('/admin');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('hyunjun-ticket-server');
    expect(html).toContain('/favicon.svg');

    const fav = await app.request('/favicon.svg');
    expect(fav.status).toBe(200);
    expect(fav.headers.get('content-type')).toContain('image/svg+xml');
  });

  it('rejects platform endpoints without valid master key', async () => {
    const res = await app.request('/v1/platform/tenants', {
      headers: { Authorization: 'Bearer wrong-key' },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects public endpoints when API key is missing', async () => {
    const res = await app.request('/v1/events');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('API_KEY_MISSING');
  });

  it('handles CORS preflight OPTIONS requests on /v1/*', async () => {
    const res = await app.request('/v1/events', {
      method: 'OPTIONS',
      headers: { Origin: 'https://concert-site.example.com' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://concert-site.example.com');
    expect(res.headers.get('access-control-allow-headers')).toContain('X-API-Key');
  });
});
