'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

/**
 * In-page nav for the leaderboard. Reads `?sport=` so it renders the right
 * sport's matches/table/stats links and hides /teams on cricket (cricket
 * has no team-supporters page yet).
 *
 * Lives as a client component so it re-renders the moment the SportSelector
 * dropdown updates the URL — server-component searchParams don't flush
 * fast enough on client-side `router.replace`.
 */
export default function LeaderboardNav() {
  const searchParams = useSearchParams();
  const isCricket = searchParams.get('sport') === 'cricket';

  const matchesHref = isCricket ? '/cricket/matches' : '/matches';
  const tableHref = isCricket ? '/cricket/matches?tab=table' : '/matches?tab=table';
  const statsHref = isCricket ? '/cricket/matches?tab=stats' : '/matches?tab=stats';
  const leaderboardHref = isCricket ? '/leaderboard?sport=cricket' : '/leaderboard';

  return (
    <nav className="mp-tabs" aria-label="Page sections">
      <Link href={matchesHref} className="mp-tab">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Matches
      </Link>
      <Link href={tableHref} className="mp-tab">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
        Table
      </Link>
      <Link href={statsHref} className="mp-tab">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Stats
      </Link>
      {/* /teams is football-only today; remove it from cricket so users can't end up there. */}
      {!isCricket && (
        <Link href="/teams" className="mp-tab">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
          Teams
        </Link>
      )}
      <Link href={leaderboardHref} className="mp-tab active" aria-current="page">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10"/><path d="M17 4v3a5 5 0 0 1-10 0V4"/><path d="M5 6H3a2 2 0 0 0 2 2"/><path d="M19 6h2a2 2 0 0 1-2 2"/></svg>
        Leaderboard
      </Link>
    </nav>
  );
}
