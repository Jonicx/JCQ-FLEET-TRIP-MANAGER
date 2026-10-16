import { attachDatabasePool } from '@neon/functions';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Pool } from 'pg';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const databaseUrl = requireEnv('DATABASE_URL');
const authBaseUrl = requireEnv('NEON_AUTH_BASE_URL');
const authJwksUrl = requireEnv('NEON_AUTH_JWKS_URL');
const allowedOrigins = new Set(
  (process.env.APP_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (allowedOrigins.size === 0) throw new Error('APP_ALLOWED_ORIGINS is required.');

const pool = new Pool({ connectionString: databaseUrl, max: 5 });
attachDatabasePool(pool);
const jwks = createRemoteJWKSet(new URL(authJwksUrl));

const jsonResponse = (body: unknown, status: number, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

function getCorsHeaders(request: Request): Headers | null {
  const origin = request.headers.get('origin');
  if (origin) {
    let localDevelopmentOrigin = false;
    try {
      const parsedOrigin = new URL(origin);
      localDevelopmentOrigin =
        parsedOrigin.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(parsedOrigin.hostname);
    } catch {
      return null;
    }
    if (!allowedOrigins.has(origin) && !localDevelopmentOrigin) return null;
  }

  const headers = new Headers({
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, PUT, OPTIONS',
    'access-control-max-age': '600',
    vary: 'Origin',
  });
  if (origin) headers.set('access-control-allow-origin', origin);
  return headers;
}

async function getUserId(request: Request): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: new URL(authBaseUrl).origin,
    });
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const corsHeaders = getCorsHeaders(request);
    if (!corsHeaders) return jsonResponse({ error: 'Origin not allowed.' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    if (request.method === 'GET' && (path === '/' || path.endsWith('/health'))) {
      try {
        await pool.query('SELECT 1');
        return jsonResponse({ ok: true, services: ['postgres', 'functions'] }, 200, corsHeaders);
      } catch (error) {
        console.error('Neon health check failed.', error);
        return jsonResponse({ error: 'Backend health check failed.' }, 503, corsHeaders);
      }
    }

    if (!path.endsWith('/snapshot') || !['GET', 'PUT'].includes(request.method)) {
      return jsonResponse({ error: 'Not found.' }, 404, corsHeaders);
    }

    const userId = await getUserId(request);
    if (!userId) return jsonResponse({ error: 'Unauthorized.' }, 401, corsHeaders);

    try {
      if (request.method === 'GET') {
        const result = await pool.query(
          'SELECT snapshot FROM app_user_state WHERE user_id = $1',
          [userId],
        );
        return jsonResponse({ snapshot: result.rows[0]?.snapshot ?? null }, 200, corsHeaders);
      }

      const bodyText = await request.text();
      if (new TextEncoder().encode(bodyText).byteLength > 5_000_000) {
        return jsonResponse({ error: 'Snapshot exceeds the 5 MB limit.' }, 413, corsHeaders);
      }

      let snapshot: unknown;
      try {
        snapshot = JSON.parse(bodyText);
      } catch {
        return jsonResponse({ error: 'Request body must be valid JSON.' }, 400, corsHeaders);
      }

      const requiredArrays = [
        'trucks',
        'truckServiceRecords',
        'drivers',
        'trips',
        'expenses',
        'spareParts',
        'invoices',
        'payments',
        'auditLogs',
      ];
      if (
        typeof snapshot !== 'object' ||
        snapshot === null ||
        !requiredArrays.every((key) => Array.isArray((snapshot as Record<string, unknown>)[key])) ||
        typeof (snapshot as Record<string, unknown>).auditActor !== 'string'
      ) {
        return jsonResponse({ error: 'Snapshot has an invalid shape.' }, 400, corsHeaders);
      }

      await pool.query(
        `INSERT INTO app_user_state (user_id, snapshot, updated_at)
         VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE
         SET snapshot = EXCLUDED.snapshot, updated_at = CURRENT_TIMESTAMP`,
        [userId, JSON.stringify(snapshot)],
      );
      return jsonResponse({ ok: true }, 200, corsHeaders);
    } catch (error) {
      console.error('Neon snapshot request failed.', error);
      return jsonResponse({ error: 'Database request failed.' }, 500, corsHeaders);
    }
  },
};
