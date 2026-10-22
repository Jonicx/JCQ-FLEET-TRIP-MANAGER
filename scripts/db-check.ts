import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import { connectWithRetry, createPool, describeHost, getConnectionString } from './db.ts';

const connectionString = getConnectionString();
const { hostname } = new URL(connectionString);
console.log(`Target: ${describeHost(connectionString)}\n`);

async function step(name: string, fn: () => Promise<string | void>) {
  const started = Date.now();
  try {
    const detail = await fn();
    console.log(`PASS  ${name}${detail ? ` - ${detail}` : ''} (${Date.now() - started} ms)`);
    return true;
  } catch (error) {
    const e = error as { code?: string; message: string };
    console.log(`FAIL  ${name} - ${e.code ?? ''} ${e.message}`);
    return false;
  }
}

const dnsOk = await step('1. DNS lookup', async () => {
  const result = await dns.lookup(hostname, { all: true });
  return result.map((r) => r.address).join(', ');
});

const tcpOk =
  dnsOk &&
  (await step('2. TCP connect to port 5432', () =>
    new Promise<void>((resolve, reject) => {
      const socket = net.connect({ host: hostname, port: 5432, timeout: 15_000 });
      socket.once('connect', () => { socket.destroy(); resolve(); });
      socket.once('timeout', () => { socket.destroy(); reject(new Error('timed out')); });
      socket.once('error', reject);
    })));

// Postgres starts TLS after an SSLRequest packet, so use the real client for the TLS+auth steps.
if (tcpOk) {
  await step('3. TLS handshake with SNI (HTTPS port 443 sanity check)', () =>
    new Promise<string>((resolve, reject) => {
      const socket = tls.connect({ host: hostname, port: 443, servername: hostname, timeout: 15_000 }, () => {
        const proto = socket.getProtocol() ?? 'unknown';
        socket.end();
        resolve(proto);
      });
      socket.once('timeout', () => { socket.destroy(); reject(new Error('timed out')); });
      socket.once('error', reject);
    }));

  const pool = createPool();
  await step('4. Postgres login + SELECT 1', async () => {
    const client = await connectWithRetry(pool, 2);
    try {
      const result = await client.query('SELECT current_database() AS db, version() AS version');
      return `${result.rows[0].db} / ${String(result.rows[0].version).split(',')[0]}`;
    } finally {
      client.release();
    }
  });
  await pool.end();
}
