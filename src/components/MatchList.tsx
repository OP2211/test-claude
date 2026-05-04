'use client';

import { useState, useEffect } from 'react';
import type { Match, User } from '@/lib/types';
import Logo from './Logo';
import TeamLogoImage from './TeamLogoImage';
import './MatchList.css';

interface MatchStatus {
  label: string;
  type: 'live' | 'finished' | 'open' | 'upcoming';
}

/** Chat room is open from 2 hours before kickoff until 3 hours after. */
function isChatOpen(match: Match): boolean {
  const now = Date.now();
  const kickoff = new Date(match.kickoff).getTime();
  const minsToKickoff = (kickoff - now) / 60_000;
  if (match.status === 'live') return true;
  // Open 2hrs before kickoff
  if (minsToKickoff <= 120 && minsToKickoff > 0) return true;
  // Past kickoff — keep open for ~2.5hrs (match duration + buffer) even if ESPN is slow to update status
  if (minsToKickoff <= 0 && minsToKickoff > -150) return true;
  // Stay open 3hrs after kickoff for finished matches
  if (match.status === 'finished' && minsToKickoff > -180) return true;
  return false;
}

function getMatchStatus(match: Match): MatchStatus {
  if (match.isDemo) return { label: 'DEMO', type: 'open' };
  const now = Date.now();
  const kickoff = new Date(match.kickoff).getTime();
  const minsToKickoff = (kickoff - now) / 60_000;
  if (match.status === 'live') return { label: 'LIVE', type: 'live' };
  if (match.status === 'finished') {
    return { label: 'FT', type: 'finished' };
  }
  // Past kickoff but ESPN hasn't marked it live yet — treat as OPEN (ESPN has a slight delay)
  if (minsToKickoff <= 0 && minsToKickoff > -150) return { label: 'OPEN', type: 'open' };
  // Way past kickoff with no live/finished status — likely ended
  if (minsToKickoff <= -150) return { label: 'FT', type: 'finished' };
  if (minsToKickoff <= 120) return { label: 'OPEN', type: 'open' };
  return { label: 'SOON', type: 'upcoming' };
}

interface CountdownProps {
  kickoff: Date;
}

function Countdown({ kickoff }: CountdownProps) {
  const [timeStr, setTimeStr] = useState<string>('');
  useEffect(() => {
    function update() {
      const diff = new Date(kickoff).getTime() - new Date().getTime();
      if (diff <= 0) { setTimeStr('Now'); return; }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      if (d > 0) {
        setTimeStr(`${d}d ${h}h ${m}m`);
      } else if (h > 0) {
        setTimeStr(`${h}h ${m}m`);
      } else {
        setTimeStr(`${m}m ${s}s`);
      }
    }
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [kickoff]);
  return <span className="ml-countdown">{timeStr}</span>;
}

function SkeletonCard() {
  return (
    <div className="ml-card skeleton" aria-hidden="true">
      <div className="sk-line sk-w40" />
      <div className="sk-teams">
        <div className="sk-circle" />
        <div className="sk-line sk-w60" />
        <div className="sk-circle" />
      </div>
      <div className="sk-line sk-w80" />
    </div>
  );
}

interface MatchListProps {
  matches: Match[];
  user: User | null;
  onSelectMatch: (match: Match) => void;
  isLoading: boolean;
  forceOpenAll?: boolean;
  isJoinDisabled?: boolean;
}

function formatGroupDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const matchDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (matchDay.getTime() - today.getTime()) / 86_400_000;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function groupByDate(matches: Match[]): Array<{ label: string; matches: Match[] }> {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const key = new Date(m.kickoff).toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries()).map(([, ms]) => ({
    label: formatGroupDate(ms[0].kickoff),
    matches: ms,
  }));
}

function formatResultDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const matchDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today.getTime() - matchDay.getTime()) / 86_400_000;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function renderResultCard(
  match: Match,
  index: number,
  onSelectMatch: (match: Match) => void,
  isJoinDisabled: boolean,
) {
  const kickoff = new Date(match.kickoff);
  const dateStr = kickoff.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const timeStr = kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      key={match.id}
      className="ml-card ml-card-result"
      style={{ animationDelay: `${index * 70}ms` }}
      aria-label={`${match.homeTeam.name} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${match.awayTeam.name}, FT`}
      onClick={() => {
        if (!isJoinDisabled) onSelectMatch(match);
      }}
      disabled={isJoinDisabled}
    >
      {/* Header row */}
      <div className="ml-card-top">
        <span className="ml-comp">{match.competition}</span>
        <span className="ml-status ml-status-finished">FT</span>
      </div>

      {/* Teams */}
      <div className="ml-teams">
        <div className="ml-team">
          {match.homeTeam.logo ? (
            <TeamLogoImage src={match.homeTeam.logo} alt="" className="ml-team-logo" aria-hidden="true" />
          ) : (
            <span className="ml-badge" aria-hidden="true">{match.homeTeam.badge}</span>
          )}
          <div className="ml-team-text">
            <span className="ml-team-name">{match.homeTeam.name}</span>
            <span className="ml-team-short">{match.homeTeam.shortName}</span>
          </div>
        </div>

        <div className="ml-center">
          <div className="ml-score-block">
            <span className="ml-score">{match.homeScore ?? 0} - {match.awayScore ?? 0}</span>
            <span className="ml-clock-ft">FT</span>
          </div>
        </div>

        <div className="ml-team ml-team-away">
          <div className="ml-team-text right">
            <span className="ml-team-name">{match.awayTeam.name}</span>
            <span className="ml-team-short">{match.awayTeam.shortName}</span>
          </div>
          {match.awayTeam.logo ? (
            <TeamLogoImage src={match.awayTeam.logo} alt="" className="ml-team-logo" aria-hidden="true" />
          ) : (
            <span className="ml-badge" aria-hidden="true">{match.awayTeam.badge}</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="ml-card-bottom">
        <span className="ml-venue">{match.venue}</span>
        <span className="ml-locked-info">{dateStr} &middot; {timeStr}</span>
      </div>
    </button>
  );
}

function RecentResults({
  onSelectMatch,
  isJoinDisabled,
}: {
  onSelectMatch: (match: Match) => void;
  isJoinDisabled: boolean;
}) {
  const [results, setResults] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/results')
      .then(r => r.json())
      .then(data => setResults(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || results.length === 0) return null;

  // Group by date (most recent first)
  const groups = groupByDate(results);
  // Relabel with past-relative dates
  for (const g of groups) {
    g.label = formatResultDate(g.matches[0].kickoff);
  }

  return (
    <section className="ml-results-wrap">
      <div className="ml-results-divider">
        <span className="ml-results-divider-line" />
        <span className="ml-results-divider-label">Recent Results</span>
        <span className="ml-results-divider-line" />
      </div>
      <div className="ml-section-header">
        {/* <div className="ml-section-left">
          <h2 className="ml-section-title">Recent Results</h2>
        </div> */}
        <span className="ml-section-count">{results.length} match{results.length !== 1 ? 'es' : ''}</span>
      </div>
      {groups.map(group => (
        <div key={group.label} className="ml-results-group">
          <p className="ml-results-date">{group.label}</p>
          <div className="ml-grid">
            {group.matches.map((m, i) => renderResultCard(m, i, onSelectMatch, isJoinDisabled))}
          </div>
        </div>
      ))}
    </section>
  );
}

export default function MatchList({
  matches,
  user,
  onSelectMatch,
  isLoading,
  forceOpenAll = false,
  isJoinDisabled = false,
}: MatchListProps) {
  const [fetchError, setFetchError] = useState<boolean>(false);
  const isMatchOpen = (match: Match) => forceOpenAll || isChatOpen(match);
  const demoOpenMatches = matches.filter((m) => m.isDemo && isMatchOpen(m));
  const openMatches = matches.filter((m) => !m.isDemo && isMatchOpen(m));
  const closedMatches = matches.filter(m => !isMatchOpen(m));
  const upcomingGroups = groupByDate(closedMatches);

  useEffect(() => {
    if (!isLoading && matches.length === 0) {
      const timer = setTimeout(() => setFetchError(true), 5000);
      return () => clearTimeout(timer);
    }
    setFetchError(false);
  }, [isLoading, matches.length]);

  const renderCard = (match: Match, index: number) => {
    const status = getMatchStatus(match);
    const open = isMatchOpen(match);
    const canOpen = open && !isJoinDisabled;
    const kickoff = new Date(match.kickoff);
    const timeStr = kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    return (
      <button
        key={match.id}
        className={`ml-card ${open ? 'open' : 'locked'} ${status.type}`}
        onClick={() => canOpen && onSelectMatch(match)}
        style={{ animationDelay: `${index * 70}ms` }}
        disabled={!canOpen}
        aria-label={`${match.homeTeam.name} vs ${match.awayTeam.name}, ${status.label}`}
      >
        {open && <div className="ml-card-glow" />}

        {/* Header row */}
        <div className="ml-card-top">
          <span className="ml-comp">{match.competition}</span>
          <span className={`ml-status ml-status-${status.type}`}>
            {status.type === 'live' && <span className="ml-live-dot" />}
            {status.label}
          </span>
        </div>

        {/* Teams */}
        <div className="ml-teams">
          <div className="ml-team">
            {match.homeTeam.logo ? (
              <TeamLogoImage src={match.homeTeam.logo} alt="" className="ml-team-logo" aria-hidden="true" />
            ) : (
              <span className="ml-badge" aria-hidden="true">{match.homeTeam.badge}</span>
            )}
            <div className="ml-team-text">
              <span className="ml-team-name">{match.homeTeam.name}</span>
              <span className="ml-team-short">{match.homeTeam.shortName}</span>
              {match.events && match.events.filter(e => e.type === 'goal' && e.teamId === 'home').length > 0 && (
                <span className="ml-scorers">
                  {match.events.filter(e => e.type === 'goal' && e.teamId === 'home').map((e, i) => (
                    <span key={i} className="ml-scorer">{e.player} {e.clock}</span>
                  ))}
                </span>
              )}
            </div>
          </div>

          <div className="ml-center">
            {status.type === 'live' ? (
              <div className="ml-score-block">
                <span className="ml-score">
                  {match.homeScore ?? 0} - {match.awayScore ?? 0}
                </span>
                <span className="ml-clock">{match.clock || 'LIVE'}</span>
              </div>
            ) : status.type === 'finished' ? (
              <div className="ml-score-block">
                <span className="ml-score">
                  {match.homeScore ?? 0} - {match.awayScore ?? 0}
                </span>
                <span className="ml-clock-ft">FT</span>
              </div>
            ) : (
              <div className="ml-time-block">
                <span className="ml-time">{timeStr}</span>
              </div>
            )}
          </div>

          <div className="ml-team ml-team-away">
            <div className="ml-team-text right">
              <span className="ml-team-name">{match.awayTeam.name}</span>
              <span className="ml-team-short">{match.awayTeam.shortName}</span>
              {match.events && match.events.filter(e => e.type === 'goal' && e.teamId === 'away').length > 0 && (
                <span className="ml-scorers">
                  {match.events.filter(e => e.type === 'goal' && e.teamId === 'away').map((e, i) => (
                    <span key={i} className="ml-scorer">{e.player} {e.clock}</span>
                  ))}
                </span>
              )}
            </div>
            {match.awayTeam.logo ? (
              <TeamLogoImage src={match.awayTeam.logo} alt="" className="ml-team-logo" aria-hidden="true" />
            ) : (
              <span className="ml-badge" aria-hidden="true">{match.awayTeam.badge}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="ml-card-bottom">
          <span className="ml-venue">{match.venue}</span>
          {open ? (
            <span className="ml-join-cta">
              {status.type === 'live' ? 'Join Live' : status.type === 'finished' ? 'Post-Match' : 'Enter Room'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          ) : (
            <span className="ml-locked-info">
              {status.type === 'finished' ? 'Ended' : <>Opens in <Countdown kickoff={new Date(kickoff.getTime() - 2 * 3600000)} /></>}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="ml-page">
      {/* Hero */}
      <div className="ml-hero">
        <Logo size={48} animate />
        <h1 className="ml-hero-title">FanGround</h1>
        <p className="ml-hero-sub">Predictions, lineups & live banter with fans worldwide</p>
        
        <div className="ml-hero-hint">
          <span className="ml-hint-dot" />
          Tap any open match to join
        </div>
        
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="ml-section" aria-busy="true">
          <div className="ml-grid">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        </div>
      )}

      {/* Demo match */}
      {demoOpenMatches.length > 0 && (
        <section className="ml-section" aria-label="Demo match">
          <div className="ml-section-header">
            <div className="ml-section-left">
              <span className="ml-section-dot active" />
              <h2 className="ml-section-title">Demo Match</h2>
            </div>
            <span className="ml-section-count">{demoOpenMatches.length} match{demoOpenMatches.length !== 1 ? 'es' : ''}</span>
          </div>
          <div className="ml-demo-center">
            {demoOpenMatches.map((m, i) => renderCard(m, i))}
          </div>
        </section>
      )}

      {/* Live & Open */}
      {openMatches.length > 0 && (
        <section className="ml-section" aria-label="Live and open matches">
          <div className="ml-section-header">
            <div className="ml-section-left">
              <span className="ml-section-dot active" />
              <h2 className="ml-section-title">Live & Open</h2>
            </div>
            <span className="ml-section-count">{openMatches.length} match{openMatches.length !== 1 ? 'es' : ''}</span>
          </div>
          <div className="ml-grid">
            {openMatches.map((m, i) => renderCard(m, i))}
          </div>
        </section>
      )}

      {/* Divider */}
      {(demoOpenMatches.length > 0 || openMatches.length > 0) && closedMatches.length > 0 && (
        <div className="ml-divider" />
      )}

      {/* Upcoming — grouped by date */}
      {upcomingGroups.map(group => (
        <section key={group.label} className="ml-section" aria-label={`${group.label} matches`}>
          <div className="ml-section-header">
            <div className="ml-section-left">
              <span className="ml-section-dot" />
              <h2 className="ml-section-title">{group.label}</h2>
            </div>
            <span className="ml-section-count">{group.matches.length} match{group.matches.length !== 1 ? 'es' : ''}</span>
          </div>
          <div className="ml-grid">
            {group.matches.map((m, i) => renderCard(m, i))}
          </div>
        </section>
      ))}

      {/* Recent results */}
      {!isLoading && (
        <RecentResults
          onSelectMatch={onSelectMatch}
          isJoinDisabled={isJoinDisabled}
        />
      )}

      {/* Empty state */}
      {!isLoading && matches.length === 0 && (
        <div className="ml-empty">
          {fetchError ? (
            <>
              <div className="ml-empty-icon-wrap error">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <p className="ml-empty-text">Connection issue</p>
              <p className="ml-empty-sub">Check your internet and try refreshing</p>
              <button className="ml-retry-btn" onClick={() => window.location.reload()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Retry
              </button>
            </>
          ) : (
            <>
              <div className="ml-empty-icon-wrap">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <p className="ml-empty-text">No matches right now</p>
              <p className="ml-empty-sub">Check back soon for upcoming fixtures</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
