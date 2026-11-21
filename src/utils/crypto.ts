import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export function generateApiKey(scope: 'public' | 'admin'): {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  const prefix = scope === 'public' ? 'pk_live_' : 'sk_live_';
  const secret = randomBytes(24).toString('hex');
  const rawKey = `${prefix}${secret}`;
  const keyPrefix = rawKey.slice(0, 14);
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyPrefix, keyHash };
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function generateReservationCode(): string {
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `RSV-${code}`;
}
