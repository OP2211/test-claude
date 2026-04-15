'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

interface HealthRun {
  runId: string;
  createdAt: string;
  results: HealthCheckResult[];
}

const HEALTH_CHECKS = [
  { name: 'Matches API', path: '/api/matches' },
  { name: 'Results API', path: '/api/results' },
  { name: 'Session API', path: '/api/auth/session' },
  { name: 'Profile API', path: '/api/profile/me' },
];

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

async function parseApiPayload(response: Response): Promise<{ data: unknown; rawText: string }> {
  const rawText = await response.text();
  try {
    return { data: JSON.parse(rawText), rawText };
  } catch {
    return { data: null, rawText };
  }
}

function EndpointLatencyGraph({ title, runs }: { title: string; runs: HealthRun[] }) {
  const W = 640;
  const H = 220;
  const pad = { l: 58, r: 24, t: 24, b: 56 };
  const x0 = pad.l;
  const x1 = W - pad.r;
  const yTop = pad.t;
  const yBottom = H - pad.b;

  const endpointDefs = HEALTH_CHECKS;
  const runCount = runs.length;
  const allDurations = runs.flatMap((run) =>
    run.results
      .map((result) => result.durationMs)
      .filter((duration): duration is number => typeof duration === 'number'),
  );
  const maxDurationMs = Math.max(1, ...allDurations);

  const xAt = (index: number) => {
    if (runCount <= 1) return (x0 + x1) / 2;
    return x0 + (index / (runCount - 1)) * (x1 - x0);
  };

  const yAt = (durationMs: number) => {
    const normalized = durationMs / maxDurationMs;
    return yBottom - normalized * (yBottom - yTop);
  };

  const linePath = (endpointPath: string) => {
    let path = '';
    let needsMove = true;
    runs.forEach((run, index) => {
      const endpoint = run.results.find((r) => r.path === endpointPath);
      const durationMs = endpoint?.durationMs;
      if (typeof durationMs !== 'number') {
        needsMove = true;
        return;
      }
      const x = xAt(index);
      const y = yAt(durationMs);
      path += needsMove ? `M ${x} ${y}` : ` L ${x} ${y}`;
      needsMove = false;
    });
    return path;
  };

  if (runs.length === 0) {
    return (
      <div className="debug-graph-card">
        <h3>{title}</h3>
        <p className="debug-meta">No health history recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="debug-graph-card">
      <h3>{title}</h3>
      <svg className="debug-graph-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = yBottom - ratio * (yBottom - yTop);
          const value = Math.round(maxDurationMs * ratio);
          return (
            <g key={ratio}>
              <line className="debug-graph-grid" x1={x0} x2={x1} y1={y} y2={y} />
              <text className="debug-graph-ylabel" x={x0 - 8} y={y + 4} textAnchor="end">
                {value}ms
              </text>
            </g>
          );
        })}

        {endpointDefs.map((endpoint, endpointIndex) => (
          <g key={endpoint.path}>
            <path
              d={linePath(endpoint.path)}
              fill="none"
              stroke={CHART_COLORS[endpointIndex % CHART_COLORS.length]}
              strokeWidth={2.5}
              vectorEffect="non-scaling-stroke"
            />
            {runs.map((run, runIndex) => {
              const item = run.results.find((r) => r.path === endpoint.path);
              if (typeof item?.durationMs !== 'number') return null;
              const x = xAt(runIndex);
              const y = yAt(item.durationMs);
              return (
                <circle
                  key={`${endpoint.path}-${run.runId}`}
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill={CHART_COLORS[endpointIndex % CHART_COLORS.length]}
                />
              );
            })}
          </g>
        ))}
      </svg>
      <div className="debug-graph-xlabels">
        {runs.map((run, index) => {
          const leftPercent = ((xAt(index) - x0) / (x1 - x0)) * 100;
          const clampedPercent = Math.min(96, Math.max(4, leftPercent));
          return (
            <span key={run.runId} style={{ left: `${clampedPercent}%` }}>
            {new Date(run.createdAt).toLocaleTimeString()}
            </span>
          );
        })}
      </div>
      <div className="debug-legend">
        {endpointDefs.map((endpoint, endpointIndex) => (
          <span key={endpoint.path} className="debug-legend-item">
            <i
              className="debug-legend-dot"
              style={{ backgroundColor: CHART_COLORS[endpointIndex % CHART_COLORS.length] }}
            />
            {endpoint.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function DebugPage() {
  const { data: session, status, update } = useSession();
  const [isChecking, setIsChecking] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [clearMessage, setClearMessage] = useState<string>('');
  const [historyRuns, setHistoryRuns] = useState<HealthRun[]>([]);
  const [historyError, setHistoryError] = useState<string>('');

  const loadHealthHistory = useCallback(async () => {
    try {
      setHistoryError('');
      const response = await fetch('/api/debug/health', { cache: 'no-store' });
      const { data, rawText } = await parseApiPayload(response);
      const payload = (data && typeof data === 'object' ? data : {}) as {
        runs?: HealthRun[];
        error?: string;
      };
      if (!response.ok) {
        const fallback = rawText.trim().startsWith('<')
          ? 'Health history endpoint returned HTML instead of JSON'
          : rawText.trim();
        throw new Error(payload.error ?? (fallback || 'Failed to load health history'));
      }
      setHistoryRuns(Array.isArray(payload.runs) ? payload.runs : []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Failed to load health history');
    }
  }, []);

  useEffect(() => {
    void loadHealthHistory();
  }, [loadHealthHistory]);

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
    try {
      const response = await fetch('/api/debug/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: checks }),
      });
      if (!response.ok) {
        const { data, rawText } = await parseApiPayload(response);
        const payload = (data && typeof data === 'object' ? data : {}) as { error?: string };
        const fallback = rawText.trim().startsWith('<')
          ? 'Health history save endpoint returned HTML instead of JSON'
          : rawText.trim();
        setHistoryError(payload.error ?? (fallback || 'Failed to save health history'));
      }
      await loadHealthHistory();
    } catch {
      // Keep the latest in-memory result even if persistence fails.
    }
    setIsChecking(false);
  }, [loadHealthHistory]);

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
              {HEALTH_CHECKS.map((item) => {
                const result = results.find((entry) => entry.path === item.path) ?? null;
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
            <h2>API Latency Timeline</h2>
            <p className="debug-meta">
              Per-endpoint response time history (milliseconds) across health-check runs.
            </p>
            {historyError && <p className="debug-meta">{historyError}</p>}
            <div className="debug-graphs">
              <EndpointLatencyGraph title="Last 5 runs (time vs ms)" runs={historyRuns.slice(-5)} />
              <EndpointLatencyGraph title="Full history (time vs ms)" runs={historyRuns} />
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
