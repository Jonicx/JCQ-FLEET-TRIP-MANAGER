import React, { FormEvent, useEffect, useState } from 'react';
import { dbStore } from '../db/store.ts';
import { checkNeonHealth, loadUserSnapshot, neonAuthClient, saveUserSnapshot } from '../neon.ts';

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

interface NeonAuthGateProps {
  children: React.ReactNode;
}

export const NeonAuthGate: React.FC<NeonAuthGateProps> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [remoteError, setRemoteError] = useState('');

  const activateUser = async (authenticatedUser: AuthenticatedUser) => {
    setIsLoading(true);
    setError('');
    try {
      await checkNeonHealth();
      await dbStore.connectRemote(authenticatedUser.id, {
        load: loadUserSnapshot,
        save: saveUserSnapshot,
        onError: (saveError) => {
          console.error('Neon autosave failed.', saveError);
          setRemoteError('A change could not be saved to Neon. Check your connection and retry the change.');
        },
      });
      setUser(authenticatedUser);
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
        if (data?.user) {
          await activateUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
          });
        } else {
          setIsLoading(false);
        }
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
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
      await activateUser({
        id: result.data.user.id,
        email: result.data.user.email,
        name: result.data.user.name,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const result = await neonAuthClient.signOut();
      if (result.error) throw new Error(result.error.message);
      dbStore.disconnectRemote();
      setUser(null);
      setRemoteError('');
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Could not sign out.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
          Connecting to Neon...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">JCQ Enterprise</p>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
              {mode === 'sign-in' ? 'Sign in to your workspace' : 'Create your workspace account'}
            </h1>
            <p className="mt-2 text-sm text-slate-500">Your fleet data is secured with Neon Auth and saved to Neon Postgres.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === 'sign-up' && (
              <label className="block text-xs font-semibold text-slate-700">
                Name
                <input
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
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
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Password
              <input
                required
                type="password"
                minLength={8}
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
            {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{message}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? 'Please wait...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setMode((current) => current === 'sign-in' ? 'sign-up' : 'sign-in');
              setError('');
              setMessage('');
            }}
            className="mt-4 w-full text-center text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            {mode === 'sign-in' ? 'New to JCQ Enterprise? Create an account' : 'Already have an account? Sign in'}
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2 text-xs shadow-sm sm:px-6 lg:px-8">
        <span className="text-slate-600">Signed in as <strong className="text-slate-900">{user.email}</strong></span>
        <button
          type="button"
          onClick={signOut}
          disabled={isSubmitting}
          className="rounded-md px-2 py-1 font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
      {remoteError && (
        <p role="alert" className="bg-rose-100 px-4 py-2 text-center text-xs font-semibold text-rose-800">
          {remoteError}
        </p>
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
