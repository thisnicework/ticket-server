import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createDb } from './db/index.js';
import { loadEnv } from './env.js';

const env = loadEnv();
const { db, client } = createDb(env.DATABASE_URL);

const app = createApp({
  db,
  platformMasterKey: env.PLATFORM_MASTER_KEY,
  enableLogger: env.NODE_ENV !== 'test',
});

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Ticketing Platform API listening on http://localhost:${info.port}`);
    console.log(`Admin Console available at http://localhost:${info.port}/admin`);
    console.log(`Swagger UI available at http://localhost:${info.port}/docs`);
  },
);

const shutdown = async () => {
  console.log('Shutting down server...');
  server.close();
  await client.end({ timeout: 5 });
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
