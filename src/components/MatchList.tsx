'use client';

import { useState, useEffect } from 'react';
import type { Match, User } from '@/lib/types';
import Logo from './Logo';
import './MatchList.css';

interface MatchStatus {
  label: string;
  type: 'live' | 'finished' | 'open' | 'upcoming';
}

function isChatOpen(match: Match): boolean {
  const now = new Date();
  const kickoff = new Date(match.kickoff);
  return match.status === 'live' || (kickoff.getTime() - now.getTime()) / 60000 <= 120;
}

function getMatchStatus(match: Match): MatchStatus {
  const now = new Date();
  const kickoff = new Date(match.kickoff);
  const minsToKickoff = (kickoff.getTime() - now.getTime()) / 60000;
  if (match.status === 'live') return { label: 'LIVE', type: 'live' };
  if (minsToKickoff < 0) return { label: 'FT', type: 'finished' };
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
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeStr(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
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
}

export default function MatchList({ matches, user, onSelectMatch, isLoading }: MatchListProps) {
  const [fetchError, setFetchError] = useState<boolean>(false);
  const openMatches = matches.filter(isChatOpen);
  const closedMatches = matches.filter(m => !isChatOpen(m));

  useEffect(() => {
    if (!isLoading && matches.length === 0) {
      const timer = setTimeout(() => setFetchError(true), 5000);
      return () => clearTimeout(timer);
    }
    setFetchError(false);
  }, [isLoading, matches.length]);

  const renderCard = (match: Match, index: number) => {
    const status = getMatchStatus(match);
    const open = isChatOpen(match);
    const kickoff = new Date(match.kickoff);
    const timeStr = kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    return (
      <button
        key={match.id}
        className={`ml-card ${open ? 'open' : 'locked'} ${status.type}`}
        onClick={() => open && onSelectMatch(match)}
        style={{ animationDelay: `${index * 70}ms` }}
        disabled={!open}
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
            <span className="ml-badge" aria-hidden="true">{match.homeTeam.badge}</span>
            <div className="ml-team-text">
              <span className="ml-team-name">{match.homeTeam.name}</span>
              <span className="ml-team-short">{match.homeTeam.shortName}</span>
            </div>
          </div>

          <div className="ml-center">
            {status.type === 'live' ? (
              <div className="ml-live-indicator">
                <span className="ml-live-text">LIVE</span>
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
            </div>
            <span className="ml-badge" aria-hidden="true">{match.awayTeam.badge}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="ml-card-bottom">
          <span className="ml-venue">{match.venue}</span>
          {open ? (
            <span className="ml-join-cta">
              {status.type === 'live' ? 'Join Live' : 'Enter Room'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          ) : (
            <span className="ml-locked-info">
              Opens in <Countdown kickoff={new Date(kickoff.getTime() - 2 * 3600000)} />
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
        <h1 className="ml-hero-title">MatchDay</h1>
        <p className="ml-hero-sub">Predictions, lineups & live banter with fans worldwide</p>
        {!user && (
          <div className="ml-hero-hint">
            <span className="ml-hint-dot" />
            Tap any open match to join
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="ml-section" aria-busy="true">
          <div className="ml-grid">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        </div>
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
      {openMatches.length > 0 && closedMatches.length > 0 && (
        <div className="ml-divider" />
      )}

      {/* Upcoming */}
      {closedMatches.length > 0 && (
        <section className="ml-section" aria-label="Upcoming matches">
          <div className="ml-section-header">
            <div className="ml-section-left">
              <span className="ml-section-dot" />
              <h2 className="ml-section-title">Coming Up</h2>
            </div>
            <span className="ml-section-count">{closedMatches.length} match{closedMatches.length !== 1 ? 'es' : ''}</span>
          </div>
          <div className="ml-grid">
            {closedMatches.map((m, i) => renderCard(m, i))}
          </div>
        </section>
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
