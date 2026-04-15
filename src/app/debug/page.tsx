'use client';

import { useCallback, useMemo, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import AppHeaderSession from '@/components/AppHeaderSession';
import SiteFooter from '@/components/SiteFooter';
import { openGoogleSignInPopup } from '@/lib/google-signin-popup';
import './debug.css';

interface HealthCheckResult {
  name: string;
  path: string;
  ok: boolean;
  status: number | null;
  durationMs: number | null;
  error?: string;
}

const HEALTH_CHECKS = [
  { name: 'Matches API', path: '/api/matches' },
  { name: 'Results API', path: '/api/results' },
  { name: 'Session API', path: '/api/auth/session' },
  { name: 'Profile API', path: '/api/profile/me' },
];

export default function DebugPage() {
  const { data: session, status, update } = useSession();
  const [isChecking, setIsChecking] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [clearMessage, setClearMessage] = useState<string>('');

  const sessionInfo = useMemo(
    () => ({
      state: status,
      isAuthenticated: status === 'authenticated',
      userName: session?.user?.name ?? '—',
      userEmail: session?.user?.email ?? '—',
      expiresAt: session?.expires ?? '—',
    }),
    [session, status],
  );

  const runHealthChecks = useCallback(async () => {
    setIsChecking(true);
    setClearMessage('');
    const checks = await Promise.all(
      HEALTH_CHECKS.map(async (item): Promise<HealthCheckResult> => {
        const start = performance.now();
        try {
          const response = await fetch(item.path, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          });
          return {
            name: item.name,
            path: item.path,
            ok: response.ok,
            status: response.status,
            durationMs: Math.round(performance.now() - start),
          };
        } catch (error) {
          return {
            name: item.name,
            path: item.path,
            ok: false,
            status: null,
            durationMs: Math.round(performance.now() - start),
            error: error instanceof Error ? error.message : 'Unknown network error',
          };
        }
      }),
    );

    setResults(checks);
    setLastRunAt(new Date().toLocaleTimeString());
    setIsChecking(false);
  }, []);

  const clearClientState = useCallback(async () => {
    setIsClearing(true);
    setClearMessage('');
    try {
      localStorage.clear();
      sessionStorage.clear();

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      for (const cookie of document.cookie.split(';')) {
        const name = cookie.split('=')[0]?.trim();
        if (!name) continue;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }

      await update();
      setClearMessage('Cleared local storage, session storage, cache storage, and non-httpOnly cookies.');
    } catch (error) {
      setClearMessage(error instanceof Error ? error.message : 'Failed to clear client state.');
    } finally {
      setIsClearing(false);
    }
  }, [update]);

  const resetAndSignOut = useCallback(async () => {
    await clearClientState();
    await signOut({ callbackUrl: '/debug' });
  }, [clearClientState]);

  return (
    <div className="app">
      <AppHeaderSession />
      <main className="app-main">
        <div className="ml-page debug-page">
          <section className="debug-section">
            <h1 className="debug-title">Debug Center</h1>
            <p className="debug-subtitle">
              Check API health, inspect auth state, and reset local session data if login behaves unexpectedly.
            </p>
          </section>

          <section className="debug-section debug-card">
            <div className="debug-row">
              <h2>API Health</h2>
              <button className="debug-btn" onClick={() => void runHealthChecks()} disabled={isChecking}>
                {isChecking ? 'Checking…' : 'Run health check'}
              </button>
            </div>
            {lastRunAt && <p className="debug-meta">Last checked: {lastRunAt}</p>}
            <div className="debug-list">
              {(results.length === 0 ? HEALTH_CHECKS : results).map((item) => {
                const result = 'ok' in item ? item : null;
                const stateClass = !result ? 'is-pending' : result.ok ? 'is-ok' : 'is-fail';
                return (
                  <div key={item.path} className={`debug-list-item ${stateClass}`}>
                    <div>
                      <div className="debug-item-title">{item.name}</div>
                      <div className="debug-item-path">{item.path}</div>
                    </div>
                    <div className="debug-item-status">
                      {!result ? 'Not checked' : result.ok ? 'Healthy' : 'Issue'}
                      {result?.status ? ` (${result.status})` : ''}
                      {typeof result?.durationMs === 'number' ? ` · ${result.durationMs}ms` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="debug-section debug-card">
            <h2>User Session</h2>
            <div className="debug-kv">
              <div><span>Status</span><strong>{sessionInfo.state}</strong></div>
              <div><span>Authenticated</span><strong>{sessionInfo.isAuthenticated ? 'Yes' : 'No'}</strong></div>
              <div><span>User</span><strong>{sessionInfo.userName}</strong></div>
              <div><span>Email</span><strong>{sessionInfo.userEmail}</strong></div>
              <div><span>Expires</span><strong>{sessionInfo.expiresAt}</strong></div>
            </div>
          </section>

          <section className="debug-section debug-card">
            <h2>Recovery Tools</h2>
            <p className="debug-meta">
              Use this if login/session gets stuck. Note: httpOnly auth cookies are cleared by Sign out.
            </p>
            <div className="debug-actions">
              <button className="debug-btn" onClick={() => void clearClientState()} disabled={isClearing}>
                {isClearing ? 'Clearing…' : 'Clear cache and local session data'}
              </button>
              <button className="debug-btn is-danger" onClick={() => void resetAndSignOut()}>
                Sign out and reset
              </button>
              <button
                className="debug-btn is-accent"
                onClick={() => void openGoogleSignInPopup(() => update())}
              >
                Resume login
              </button>
            </div>
            {clearMessage && <p className="debug-meta">{clearMessage}</p>}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
