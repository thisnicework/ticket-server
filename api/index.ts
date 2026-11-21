import { handle } from 'hono/vercel';
import { createApp } from '../src/app.js';
import { createDb } from '../src/db/index.js';
import { loadEnv } from '../src/env.js';

let cachedHandler: ReturnType<typeof handle> | null = null;

function getHandler() {
  if (!cachedHandler) {
    const env = loadEnv();
    const { db } = createDb(env.DATABASE_URL);
    const app = createApp({
      db,
      platformMasterKey: env.PLATFORM_MASTER_KEY,
      enableLogger: env.NODE_ENV !== 'test',
    });
    cachedHandler = handle(app);
  }
  return cachedHandler;
}

export const GET = (req: Request) => getHandler()(req);
export const POST = (req: Request) => getHandler()(req);
export const PUT = (req: Request) => getHandler()(req);
export const PATCH = (req: Request) => getHandler()(req);
export const DELETE = (req: Request) => getHandler()(req);
export const OPTIONS = (req: Request) => getHandler()(req);
export const HEAD = (req: Request) => getHandler()(req);
