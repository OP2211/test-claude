import Link from 'next/link';
import type { CSSProperties } from 'react';
import AppHeaderSession from '@/components/AppHeaderSession';
import SiteFooter from '@/components/SiteFooter';
import TeamLogoImage from '@/components/TeamLogoImage';
import TeamsCacheRefresher from '@/components/TeamsCacheRefresher';
import {
  buildTeamCardsSnapshot,
  refreshTeamCardsCache,
  getTeamCardsCache,
  type TeamCardData,
} from '@/lib/team-cards-cache';
import '../page.css';
import './teams.css';

function formatForm(team: TeamCardData): string {
  return `${team.wins}W ${team.draws}D ${team.losses}L`;
}

export default async function TeamsPage() {
  let { rows: teamsSorted, isFresh } = await getTeamCardsCache();
  let shouldRefreshInBackground = !isFresh;

  if (teamsSorted.length === 0) {
    try {
      await refreshTeamCardsCache();
      const refreshed = await getTeamCardsCache();
      teamsSorted = refreshed.rows;
      shouldRefreshInBackground = false;
    } catch {
      teamsSorted = await buildTeamCardsSnapshot();
      shouldRefreshInBackground = false;
    }
  }

  if (teamsSorted.length === 0) {
    teamsSorted = await buildTeamCardsSnapshot();
    shouldRefreshInBackground = false;
  }

  return (
    <div className="app">
      <AppHeaderSession />
      <main className="app-main">
        <TeamsCacheRefresher shouldRefresh={shouldRefreshInBackground} />
        <nav className="mp-tabs" aria-label="Page sections">
          <Link href="/matches" className="mp-tab">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Matches
          </Link>
          <Link href="/matches?tab=table" className="mp-tab">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            Table
          </Link>
          <Link href="/matches?tab=stats" className="mp-tab">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Stats
          </Link>
          <Link href="/teams" className="mp-tab active" aria-current="page">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
            Teams
          </Link>
          <Link href="/leaderboard" className="mp-tab">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10"/><path d="M17 4v3a5 5 0 0 1-10 0V4"/><path d="M5 6H3a2 2 0 0 0 2 2"/><path d="M19 6h2a2 2 0 0 1-2 2"/></svg>
            Leaderboard
          </Link>
        </nav>
        <div className="ml-page teams-page">
          

          <section className="teams-grid" aria-label="Team list">
            {teamsSorted.map((team) => {
              const topSupporters = team.topSupporters;
              const lastFive = team.lastFive;

              return (
                <Link
                  key={team.teamId}
                  href={`/teams/${team.teamId}`}
                  className="team-card"
                  style={{ '--team-accent': team.teamColor } as CSSProperties}
                >
                  <div className="team-card-top">
                    <span className="team-card-logo-wrap">
                      <TeamLogoImage src={team.teamLogo} alt={`${team.teamName} logo`} className="team-card-logo" />
                    </span>
                    <div className="team-card-title-wrap">
                      <span className="team-card-name">{team.teamName}</span>
                      <span className="team-card-rank">
                        {team.rank ? `#${team.rank} in league` : 'League rank unavailable'}
                      </span>
                    </div>
                  </div>

                  <div className="team-card-stats">
                    <span className="team-stat-pill">
                      <strong>📊 Form</strong>
                      <span>{formatForm(team)}</span>
                    </span>
                    <span className="team-stat-pill">
                      <strong>👥 Supporters</strong>
                      <span>{team.supportersCount}</span>
                    </span>
                  </div>

                  <div className="team-last-five" aria-label="Last five results">
                    <span className="team-last-five-label">Last 5</span>
                    <div className="team-result-chips">
                      {lastFive.length === 0 ? (
                        <span className="team-last-five-empty">No recent results</span>
                      ) : (
                        lastFive.map((result, index) => (
                          <span key={`${team.teamId}-${index}`} className={`team-result-chip is-${result.toLowerCase()}`}>
                            {result}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="team-card-supporters">
                    <div className="team-supporter-avatars" aria-label="Top supporters">
                      {topSupporters.length === 0 ? (
                        <span className="team-supporter-empty">No supporters yet</span>
                      ) : (
                        topSupporters.map((supporter) => (
                          <span key={supporter.google_sub} className="team-supporter-avatar" title={supporter.username}>
                            {supporter.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={supporter.image} alt="" />
                            ) : (
                              supporter.username[0]?.toUpperCase() ?? '?'
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
