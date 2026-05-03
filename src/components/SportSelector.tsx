'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import './SportSelector.css';

export interface SportEntry {
  id: string;
  name: string;
  icon: string;
  route: string;
  available: boolean;
  subtitle?: string;
}

/** Central registry — adding a new sport is a one-line change here. */
export const SPORTS: SportEntry[] = [
  { id: 'football', name: 'Football', icon: '⚽', route: '/matches',          available: true,  subtitle: 'Premier League · FA Cup' },
  { id: 'cricket',  name: 'Cricket',  icon: '🏏', route: '/cricket/matches',  available: true,  subtitle: 'Indian Premier League' },
  // { id: 'tennis',   name: 'Tennis',   icon: '🎾', route: '#',                 available: false, subtitle: 'Coming soon' },
  // { id: 'f1',       name: 'Formula 1', icon: '🏎️', route: '#',                available: false, subtitle: 'Coming soon' },
  // { id: 'nba',      name: 'Basketball', icon: '🏀', route: '#',               available: false, subtitle: 'Coming soon' },
];

function activeSport(
  pathname: string | null | undefined,
  searchParams: URLSearchParams | null,
): SportEntry {
  if (!pathname) return SPORTS[0];
  // /leaderboard is sport-neutral routing-wise — sport lives in the ?sport query param.
  if (pathname.startsWith('/leaderboard')) {
    const sportParam = searchParams?.get('sport');
    return sportParam === 'cricket'
      ? SPORTS.find((s) => s.id === 'cricket') ?? SPORTS[0]
      : SPORTS.find((s) => s.id === 'football') ?? SPORTS[0];
  }
  if (pathname.startsWith('/cricket')) return SPORTS.find((s) => s.id === 'cricket') ?? SPORTS[0];
  return SPORTS.find((s) => s.id === 'football') ?? SPORTS[0];
}

/**
 * Where to send the user when they pick a sport from the dropdown.
 * On /leaderboard we toggle the ?sport= param so the user stays on the leaderboard;
 * everywhere else we navigate to that sport's matches page.
 */
function targetRouteFor(sport: SportEntry, pathname: string | null | undefined): string {
  if (pathname?.startsWith('/leaderboard')) {
    return sport.id === 'cricket' ? '/leaderboard?sport=cricket' : '/leaderboard';
  }
  return sport.route;
}

export default function SportSelector() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = activeSport(pathname, searchParams);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="ssel" ref={rootRef}>
      <button
        type="button"
        className="ssel-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Sport: ${current.name}. Change sport.`}
      >
        <span className="ssel-trigger-icon" aria-hidden>{current.icon}</span>
        <span className="ssel-trigger-name">{current.name}</span>
        <svg
          className={`ssel-chevron ${open ? 'ssel-chevron--open' : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="ssel-menu" role="menu">
          <div className="ssel-menu-header">Sports</div>
          <ul className="ssel-menu-list">
            {SPORTS.map((sport) => {
              const isActive = sport.id === current.id;
              const inner = (
                <>
                  <span className="ssel-item-icon" aria-hidden>{sport.icon}</span>
                  <div className="ssel-item-text">
                    <div className="ssel-item-name">
                      {sport.name}
                      {!sport.available && <span className="ssel-item-badge">Soon</span>}
                      {isActive && <span className="ssel-item-check" aria-hidden>✓</span>}
                    </div>
                    {sport.subtitle && (
                      <div className="ssel-item-sub">{sport.subtitle}</div>
                    )}
                  </div>
                </>
              );
              const className = `ssel-item ${isActive ? 'ssel-item--active' : ''} ${!sport.available ? 'ssel-item--disabled' : ''}`;
              return (
                <li key={sport.id} role="none">
                  {sport.available ? (
                    <Link
                      href={targetRouteFor(sport, pathname)}
                      prefetch={false}
                      className={className}
                      role="menuitem"
                      onClick={close}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div
                      className={className}
                      role="menuitem"
                      aria-disabled="true"
                      tabIndex={-1}
                    >
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
