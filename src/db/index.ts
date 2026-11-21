import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export function createDb(databaseUrl: string) {
  // Supabase Supavisor Transaction Pooler(6543) 호환을 위해 prepare: false 설정
  const client = postgres(databaseUrl, {
    prepare: false,
    max: 10,
  });

  const db = drizzle(client, { schema });
  return { db, client };
}

export type Database = ReturnType<typeof createDb>['db'];
