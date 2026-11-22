import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export function createDb(databaseUrl: string) {
  // Supabase Supavisor Transaction Pooler(6543) 호환을 위해 prepare: false 설정
  // Vercel Serverless 환경에서 유휴 커넥션 끊김(stale socket) 방지 및 동시 쿼리 안정화
  const client = postgres(databaseUrl, {
    prepare: false,
    max: process.env.VERCEL ? 3 : 10,
    idle_timeout: 20,
    max_lifetime: 60 * 5,
    connect_timeout: 15,
  });

  const db = drizzle(client, { schema });
  return { db, client };
}

export type Database = ReturnType<typeof createDb>['db'];
