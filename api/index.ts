import { createApp } from '../src/app.js';
import { createDb } from '../src/db/index.js';

let cachedApp: ReturnType<typeof createApp> | null = null;

function getApp() {
  if (!cachedApp) {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    const platformMasterKey = process.env.PLATFORM_MASTER_KEY?.trim() ?? '';
    const db = databaseUrl ? createDb(databaseUrl).db : null;

    cachedApp = createApp({
      db,
      platformMasterKey,
      enableLogger: process.env.NODE_ENV !== 'test',
    });
  }
  return cachedApp;
}

async function handleRequest(req: Request): Promise<Response> {
  try {
    return await getApp().fetch(req);
  } catch (err) {
    console.error('[Vercel Handler Error]', err);
    return new Response(
      JSON.stringify({
        error: {
          code: 'SERVERLESS_ERROR',
          message: err instanceof Error ? err.message : 'Unknown serverless error',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const OPTIONS = handleRequest;
export const HEAD = handleRequest;
