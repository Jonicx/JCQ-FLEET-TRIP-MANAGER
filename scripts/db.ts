import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

/**
 * Picks the connection string and makes the SSL mode explicit so pg stops
 * printing its "sslmode aliases" security warning.
 *
 * Default: DATABASE_URL_UNPOOLED (best for migrations).
 * Pass --pooled to use DATABASE_URL (the -pooler host) instead.
 */
export function getConnectionString(): string {
  const usePooled = process.argv.includes('--pooled');
  const name = usePooled ? 'DATABASE_URL' : 'DATABASE_URL_UNPOOLED';
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is missing. Add it to .env.local (run \`neon deploy\` to pull it).`);

  const url = new URL(raw);
  const mode = url.searchParams.get('sslmode');
  if (!mode || ['require', 'prefer', 'verify-ca'].includes(mode)) {
    url.searchParams.set('sslmode', 'verify-full');
  }
  // channel_binding is not needed for the node-postgres driver.
  url.searchParams.delete('channel_binding');
  return url.toString();
}

export function describeHost(connectionString: string): string {
  const url = new URL(connectionString);
  return `${url.hostname}:${url.port || '5432'}/${url.pathname.replace(/^\//, '')}`;
}

export function createPool(): Pool {
  return new Pool({
    connectionString: getConnectionString(),
    max: 1,
    connectionTimeoutMillis: 30_000, // allows for Neon compute cold start
  });
}

/** Connects with retries; prints actionable hints on the common failures. */
export async function connectWithRetry(pool: Pool, attempts = 4) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await pool.connect();
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string }).code;
      console.error(`Connection attempt ${attempt}/${attempts} failed${code ? ` (${code})` : ''}: ${(error as Error).message}`);
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  console.error(`
Could not reach Neon. ECONNRESET during TLS usually means something between this
computer and Neon is cutting the connection. Try, in order:
  1. Run:  npm run db:check            (tests DNS, TCP and TLS separately)
  2. Retry with the pooled host:        npm run db:migrate -- --pooled
  3. Switch network (phone hotspot) or turn a VPN on/off.
  4. Temporarily disable antivirus "HTTPS/SSL scanning" or a firewall that
     inspects TLS (Kaspersky, ESET, Avast, corporate proxies).
  5. In the Neon console confirm the project/branch is active and that no
     IP allow-list is enabled for this branch.
`);
  throw lastError;
}
