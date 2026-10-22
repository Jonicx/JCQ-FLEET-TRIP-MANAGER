import React, { FormEvent, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { dbStore } from '../db/store.ts';
import { checkNeonHealth, fetchCurrentMember, neonAuthClient, teamBackend, type TeamMember } from '../neon.ts';
import { useUser } from "../contexts/UserContext";

interface NeonAuthGateProps {
  children: React.ReactNode;
  onSignOut?: () => void;
  onOpenProfile?: () => void;
  onSignOutReady?: (signOut: () => Promise<void>) => void;
}

type AuthMode = 'sign-in' | 'sign-up' | 'forgot' | 'reset';

const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm';

const SYNC_LABELS = {
  local: { text: 'Local only', className: 'bg-slate-100 text-slate-600' },
  synced: { text: 'Saved to Neon', className: 'bg-emerald-50 text-emerald-700' },
  syncing: { text: 'Saving...', className: 'bg-amber-50 text-amber-700' },
  offline: { text: 'Offline - retrying', className: 'bg-rose-50 text-rose-700' },
} as const;

const useSyncState = () =>
  useSyncExternalStore(
    (callback) => dbStore.subscribe(callback),
    () => `${dbStore.getSyncStatus()}|${dbStore.getPendingChangeCount()}`,
  );

export const NeonAuthGate: React.FC<NeonAuthGateProps> = ({ children, onSignOut, onOpenProfile, onSignOutReady }) => {
  const { setUserInfo } = useUser();
  const [member, setMember] = useState<TeamMember | null>(null);
  const [pendingMember, setPendingMember] = useState<TeamMember | null>(null);
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [remoteError, setRemoteError] = useState('');
  const syncState = useSyncState();
  const [syncStatus, pendingCount] = syncState.split('|') as [keyof typeof SYNC_LABELS, string];

  const activateUser = async () => {
    setIsLoading(true);
    setError('');
    try {
      await checkNeonHealth();
      const current = await fetchCurrentMember();
      
      // Null-safety Check: Halts processing safely if workspace membership info record is completely missing
      if (!current) {
        throw new Error('Your user profile account record could not be loaded from the team roster table.');
      }
      
      if (!current.active) {
        setPendingMember(current);
        return;
      }
      await dbStore.connectRemote(current.id, teamBackend, {
        role: current.role,
        actorName: current.name || current.email,
        onError: (saveMessage) => setRemoteError(saveMessage),
      });
      setPendingMember(null);
      setMember(current);
      setUserInfo({
        userName: current.name || current.email,
        userEmail: current.email,
        userRole: current.role,
        profilePictureId: current.profilePictureId,
      });
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : 'Could not connect to Neon.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    neonAuthClient.getSession()
      .then(async ({ data, error: sessionError }) => {
        if (sessionError) throw new Error(sessionError.message);
        if (cancelled) return;
        if (data?.user) await activateUser();
        else setIsLoading(false);
      })
      .catch((sessionError: unknown) => {
        if (!cancelled) {
          setError(sessionError instanceof Error ? sessionError.message : 'Could not restore the Neon Auth session.');
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
      dbStore.disconnectRemote();
    };
  }, []);

  // Expose signOut function to parent component
  useEffect(() => {
    if (onSignOutReady) {
      onSignOutReady(signOut);
    }
  }, [onSignOutReady, signOut]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setMessage('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'forgot') {
        const result = await neonAuthClient.emailOtp.sendVerificationOtp({ email, type: 'forget-password' });
        if (result.error) throw new Error(result.error.message);
        setMode('reset');
        setMessage('If that email has an account, a reset code is on its way. Enter it below with your new password.');
        return;
      }
      if (mode === 'reset') {
        const result = await neonAuthClient.emailOtp.resetPassword({ email, otp: otp.trim(), password });
        if (result.error) throw new Error(result.error.message);
        setMode('sign-in');
        setPassword('');
        setOtp('');
        setMessage('Password updated. Sign in with your new password.');
        return;
      }
      if (mode === 'sign-up') {
        const result = await neonAuthClient.signUp.email({ email, password, name: name.trim() });
        if (result.error) throw new Error(result.error.message);
      } else {
        const result = await neonAuthClient.signIn.email({ email, password });
        if (result.error) throw new Error(result.error.message);
      }

      const result = await neonAuthClient.getSession();
      if (result.error) throw new Error(result.error.message);
      if (!result.data?.user) {
        setMessage('Account created. Verify your email if prompted, then sign in.');
        setMode('sign-in');
        return;
      }
      await activateUser();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = useCallback(async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const result = await neonAuthClient.signOut();
      if (result.error) throw new Error(result.error.message);
      dbStore.disconnectRemote();
      setMember(null);
      setPendingMember(null);
      setRemoteError('');
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Could not sign out.');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p role="status" className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
          In a min Twizzy...
        </p>
      </main>
    );
  }

  if (pendingMember) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">JCQ Enterprise</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Waiting for approval</h1>
          <p className="mt-2 text-sm text-slate-600">
            <strong className="text-slate-900">{pendingMember.email}</strong> is signed in, but an administrator needs to approve
            this account before it can see the team's fleet data.
          </p>
          {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void activateUser()}
              className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              Check again
            </button>
            <button
              type="button"
              onClick={signOut}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Sign out
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!member) {
    const titles: Record<AuthMode, string> = {
      'sign-in': 'Sign in to your workspace',
      'sign-up': 'Create your workspace account',
      forgot: 'Reset your password',
      reset: 'Choose a new password',
    };
    const submitLabels: Record<AuthMode, string> = {
      'sign-in': 'Sign in',
      'sign-up': 'Create account',
      forgot: 'Send reset code',
      reset: 'Update password',
    };
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">JCQ Enterprise</p>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{titles[mode]}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {mode === 'sign-up'
                ? 'New accounts can see team data once an administrator approves them.'
                : 'Your team shares one fleet workspace, secured with Neon Auth and saved to Neon Postgres.'}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === 'sign-up' && (
              <label className="block text-xs font-semibold text-slate-700">
                Name
                <input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
              </label>
            )}
            <label className="block text-xs font-semibold text-slate-700">
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
            </label>
            {mode === 'reset' && (
              <label className="block text-xs font-semibold text-slate-700">
                Reset code
                <input
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"

                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  className={inputClass}
                />
              </label>
            )}
            {mode !== 'forgot' && (
              <label className="block text-xs font-semibold text-slate-700">
                {mode === 'reset' ? 'New password' : 'Password'}
                <input
                  required
                  type="password"
                  minLength={8}
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                />
              </label>
            )}
            {mode === 'sign-in' && (
              <div className="-mt-2 text-right">
                <button type="button" onClick={() => switchMode('forgot')} className="text-xs font-semibold text-amber-700 hover:text-amber-900">
                  Forgot password?
                </button>
              </div>
            )}
            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
            {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{message}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? 'Please wait...' : submitLabels[mode]}
            </button>
          </form>
          <button
            type="button"
            onClick={() => switchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
            className="mt-4 w-full text-center text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            {mode === 'sign-in' ? 'New to JCQ Enterprise? Create an account' : 'Back to sign in'}
          </button>
        </section>
      </main>
    );
  }

  const sync = SYNC_LABELS[syncStatus] ?? SYNC_LABELS.local;
  const pending = Number(pendingCount);

  return (
    <>
      {remoteError && (
        <div role="alert" className="flex items-center justify-center gap-3 bg-rose-100 px-4 py-2 text-center text-xs font-semibold text-rose-800">
          <span>{remoteError}</span>
          <button type="button" onClick={() => setRemoteError('')} className="rounded px-1.5 font-bold hover:bg-rose-200" aria-label="Dismiss">
            x
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="bg-rose-100 px-4 py-2 text-center text-xs font-semibold text-rose-800">
          {error}
        </p>
      )}
      {children}
    </>
  );
};
