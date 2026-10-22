import { createAuthClient } from '@neondatabase/auth';
import { CommandRejectedError, type CommandRecord, type RemoteBackend, type RemoteState } from './src/db/store.ts';
import type { AppRole } from './src/db/domain.ts';

const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL;
if (!neonAuthUrl) {
  throw new Error('VITE_NEON_AUTH_URL is not configured.');
}
export const neonAuthClient = createAuthClient(neonAuthUrl);

const functionBaseUrl = import.meta.env.VITE_NEON_FUNCTION_HELLO_BASE_URL;

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  active: boolean;
  created_at?: string;
}

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

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(getFunctionUrl(path), {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const message = await getResponseError(response);
    if (response.status >= 400 && response.status < 500 && response.status !== 401 && response.status !== 408 && response.status !== 429) {
      throw new CommandRejectedError(message);
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function checkNeonHealth() {
  const response = await fetch(getFunctionUrl('health'));
  if (!response.ok) throw new Error(await getResponseError(response));
  const result: unknown = await response.json();
  if (typeof result !== 'object' || result === null || !('ok' in result) || result.ok !== true) {
    throw new Error('Neon Function returned an invalid health response.');
  }
}

export async function fetchCurrentMember(): Promise<TeamMember> {
  const body = await apiRequest<{ user: TeamMember }>('me');
  return body.user;
}

function assertState(body: unknown): RemoteState | null {
  if (typeof body !== 'object' || body === null || !('version' in body) || !('snapshot' in body)) {
    throw new Error('Neon Function returned an invalid state response.');
  }
  const state = body as { version: number; snapshot: RemoteState['snapshot'] | null };
  if (state.snapshot === null) return null;
  return { version: Number(state.version), snapshot: state.snapshot };
}

export const teamBackend: RemoteBackend = {
  async loadState(sinceVersion: number) {
    return assertState(await apiRequest(`state?since=${encodeURIComponent(String(sinceVersion))}`));
  },
  async sendCommand(record: CommandRecord) {
    const state = assertState(await apiRequest('commands', { method: 'POST', body: JSON.stringify(record) }));
    if (!state) throw new Error('Neon Function returned an empty state after saving.');
    return state;
  },
};

export async function listTeamMembers(): Promise<TeamMember[]> {
  const body = await apiRequest<{ members: TeamMember[] }>('team');
  return body.members;
}

export async function updateTeamMember(id: string, changes: { role?: AppRole; active?: boolean }): Promise<TeamMember> {
  const body = await apiRequest<{ member: TeamMember }>(`team/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
  return body.member;
}
