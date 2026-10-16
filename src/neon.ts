import { createAuthClient } from '@neondatabase/auth';
import type { DatabaseSnapshot } from './db/store.ts';

export const neonAuthClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL);

const functionBaseUrl = import.meta.env.VITE_NEON_FUNCTION_HELLO_BASE_URL;

function getFunctionUrl(path: string) {
  if (!functionBaseUrl) {
    throw new Error('VITE_NEON_FUNCTION_HELLO_BASE_URL is not configured.');
  }
  return new URL(path, `${functionBaseUrl.replace(/\/+$/, '')}/`);
}

async function getAccessToken() {
  const result = await neonAuthClient.token();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.token) throw new Error('Neon Auth did not return an access token.');
  return result.data.token;
}

async function getResponseError(response: Response) {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
      return body.error;
    }
  } catch {
    return `Neon Function returned HTTP ${response.status}.`;
  }
  return `Neon Function returned HTTP ${response.status}.`;
}

export async function checkNeonHealth() {
  const response = await fetch(getFunctionUrl('health'));
  if (!response.ok) throw new Error(await getResponseError(response));
  const result: unknown = await response.json();
  if (
    typeof result !== 'object' ||
    result === null ||
    !('ok' in result) ||
    result.ok !== true
  ) {
    throw new Error('Neon Function returned an invalid health response.');
  }
}

export async function loadUserSnapshot(): Promise<DatabaseSnapshot | null> {
  const token = await getAccessToken();
  const response = await fetch(getFunctionUrl('snapshot'), {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(await getResponseError(response));

  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null || !('snapshot' in body)) {
    throw new Error('Neon Function returned an invalid snapshot response.');
  }
  if (body.snapshot === null) return null;

  const snapshot = body.snapshot;
  const candidate = snapshot as Record<string, unknown>;
  const arrays = [
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
    !arrays.every((key) => Array.isArray(candidate[key])) ||
    typeof candidate.auditActor !== 'string'
  ) {
    throw new Error('Neon Function returned a malformed database snapshot.');
  }
  return snapshot as DatabaseSnapshot;
}

export async function saveUserSnapshot(snapshot: DatabaseSnapshot) {
  const token = await getAccessToken();
  const response = await fetch(getFunctionUrl('snapshot'), {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(snapshot),
  });
  if (!response.ok) throw new Error(await getResponseError(response));
}
