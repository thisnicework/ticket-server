import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export function createDb(databaseUrl: string) {
  // Supabase Supavisor Transaction Pooler(6543) 호환을 위해 prepare: false 설정
  // Vercel Serverless 환경에서는 커넥션 고갈 방지를 위해 max: 1 사용
  const client = postgres(databaseUrl, {
    prepare: false,
    max: process.env.VERCEL ? 1 : 10,
  });

  const db = drizzle(client, { schema });
  return { db, client };
}

export type Database = ReturnType<typeof createDb>['db'];
