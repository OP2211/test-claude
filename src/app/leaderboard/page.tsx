import Link from 'next/link';
import { Heart, MessageSquare } from 'lucide-react';
import AppHeaderSession from '@/components/AppHeaderSession';
import SiteFooter from '@/components/SiteFooter';
import TeamLogoImage from '@/components/TeamLogoImage';
import EarlyAdopterBadge from '@/components/EarlyAdopterBadge';
import { getLeaderboardProfiles } from '@/lib/profile-repo';
import { TEAMS } from '@/lib/teams';
import '../page.css';
import './leaderboard.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LeaderboardSort = 'latest' | 'messages' | 'reactions' | 'invites' | 'name';

interface LeaderboardPageProps {
  searchParams?: {
    sort?: string;
  };
}

const FOUNDING_FAN_TIER_CLASS: Record<'founding' | 'silver' | 'bronze', string> = {
  founding: 'leaderboard-badge--founding-gold',
  silver: 'leaderboard-badge--founding-silver',
  bronze: 'leaderboard-badge--founding-bronze',
};

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const profiles = await getLeaderboardProfiles();
  const requestedSort = searchParams?.sort;
  const sort: LeaderboardSort =
    requestedSort === 'messages' ||
    requestedSort === 'reactions' ||
    requestedSort === 'invites' ||
    requestedSort === 'name' ||
    requestedSort === 'latest'
      ? requestedSort
      : 'latest';
  const mostMessages = profiles.reduce((max, profile) => Math.max(max, profile.messagesSent), 0);
  const mostReactions = profiles.reduce((max, profile) => Math.max(max, profile.reactionsReceived), 0);
  const sortedProfiles = [...profiles].sort((a, b) => {
    if (sort === 'messages') {
      return b.messagesSent - a.messagesSent;
    }
    if (sort === 'reactions') {
      return b.reactionsReceived - a.reactionsReceived;
    }
    if (sort === 'invites') {
      return b.successfulInvites - a.successfulInvites;
    }
    if (sort === 'name') {
      const nameA = (a.full_name?.trim() || a.username).toLowerCase();
      const nameB = (b.full_name?.trim() || b.username).toLowerCase();
      return nameA.localeCompare(nameB);
    }
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div className="app">
      <AppHeaderSession />
      <main className="app-main">
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
          <Link href="/teams" className="mp-tab">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
            Teams
          </Link>
          <Link href="/leaderboard" className="mp-tab active" aria-current="page">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10"/><path d="M17 4v3a5 5 0 0 1-10 0V4"/><path d="M5 6H3a2 2 0 0 0 2 2"/><path d="M19 6h2a2 2 0 0 1-2 2"/></svg>
            Leaderboard
          </Link>
        </nav>
        <div className="ml-page leaderboard-page">
          <section className="leaderboard-card" aria-label="Leaderboard users table">
            <div className="leaderboard-head">
              <h1 className="leaderboard-title">Leaderboard</h1>
              <p className="leaderboard-subtitle">All users with teams, join dates, and badges.</p>
              <div className="leaderboard-sort-row" aria-label="Sort leaderboard">
                <span className="leaderboard-sort-label">Sort:</span>
                <Link href="/leaderboard?sort=latest" className={`leaderboard-sort-link ${sort === 'latest' ? 'is-active' : ''}`}>
                  Latest
                </Link>
                <Link href="/leaderboard?sort=messages" className={`leaderboard-sort-link ${sort === 'messages' ? 'is-active' : ''}`}>
                  Messages
                </Link>
                <Link href="/leaderboard?sort=reactions" className={`leaderboard-sort-link ${sort === 'reactions' ? 'is-active' : ''}`}>
                  Reactions
                </Link>
                <Link href="/leaderboard?sort=invites" className={`leaderboard-sort-link ${sort === 'invites' ? 'is-active' : ''}`}>
                  Successful Invites
                </Link>
                <Link href="/leaderboard?sort=name" className={`leaderboard-sort-link ${sort === 'name' ? 'is-active' : ''}`}>
                  Name
                </Link>
              </div>
            </div>

            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Team</th>
                    <th>
                      <span className="leaderboard-th-long">Joining date</span>
                      <span className="leaderboard-th-short">Joined</span>
                    </th>
                    <th>
                      <span className="leaderboard-th-long">Messages Sent</span>
                      <span className="leaderboard-th-short">Msgs</span>
                    </th>
                    <th>
                      <span className="leaderboard-th-long">Reactions Received</span>
                      <span className="leaderboard-th-short">Reacts</span>
                    </th>
                    <th>
                      <span className="leaderboard-th-long">Successful Invites</span>
                      <span className="leaderboard-th-short">Invites</span>
                    </th>
                    <th>Badges</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProfiles.map((profile) => {
                    const team = TEAMS.find((item) => item.id === profile.fan_team_id) ?? null;
                    const displayName = profile.full_name?.trim() || profile.username;
                    return (
                      <tr key={profile.google_sub}>
                        <td data-label="Name">
                          <Link href={`/profile/${encodeURIComponent(profile.username)}`} className="leaderboard-user-link">
                            <span className="leaderboard-user-cell">
                              <span className="leaderboard-user-avatar" aria-hidden>
                                {profile.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={profile.image} alt="" />
                                ) : (
                                  displayName[0]?.toUpperCase() ?? '?'
                                )}
                              </span>
                              <span className="leaderboard-user-meta">
                                <span className="leaderboard-user-name">{displayName}</span>
                                <span className="leaderboard-user-username">@{profile.username}</span>
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td data-label="Team">
                          {team ? (
                            <span className="leaderboard-team">
                              <TeamLogoImage src={team.logo} alt={`${team.name} logo`} className="leaderboard-team-logo" />
                              <span>{team.name}</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td data-label="Joining date">{formatMemberSince(profile.created_at)}</td>
                        <td data-label="Messages Sent">{profile.messagesSent}</td>
                        <td data-label="Reactions Received">{profile.reactionsReceived}</td>
                        <td data-label="Successful Invites">{profile.successfulInvites}</td>
                        <td data-label="Badges">
                          <div className="leaderboard-badges">
                            <EarlyAdopterBadge />
                            {mostMessages > 0 && profile.messagesSent === mostMessages && (
                              <span className="leaderboard-badge leaderboard-badge--messages" aria-label="Badge: Most Messages">
                                <MessageSquare size={13} aria-hidden />
                                <span className="leaderboard-badge-text">Most Messages</span>
                              </span>
                            )}
                            {mostReactions > 0 && profile.reactionsReceived === mostReactions && (
                              <span className="leaderboard-badge leaderboard-badge--reactions" aria-label="Badge: Most Reactions">
                                <Heart size={13} aria-hidden />
                                <span className="leaderboard-badge-text">Most Reactions</span>
                              </span>
                            )}
                            {profile.foundingFanTier && team && (
                              <span
                                className={`leaderboard-badge ${FOUNDING_FAN_TIER_CLASS[profile.foundingFanTier]}`}
                                aria-label="Badge: Founding Fan"
                              >
                                <TeamLogoImage src={team.logo} alt="" className="leaderboard-badge-team-logo" />
                                <span className="leaderboard-badge-text">Founding Fan</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function formatMemberSince(value?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
