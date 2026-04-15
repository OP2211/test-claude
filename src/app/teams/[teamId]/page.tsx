import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { getServerSession } from 'next-auth';
import AppHeaderSession from '@/components/AppHeaderSession';
import SiteFooter from '@/components/SiteFooter';
import TeamLogoImage from '@/components/TeamLogoImage';
import { getProfileByGoogleSub, getSupportersByTeamId } from '@/lib/profile-repo';
import { authOptions } from '@/lib/auth-options';
import { isValidTeamId, TEAMS } from '@/lib/teams';
import { getMatches } from '@/lib/data';
import type { Match, TeamId } from '@/lib/types';
import '../teams.css';

interface TeamDetailPageProps {
  params: {
    teamId: string;
  };
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { teamId } = params;

  if (!isValidTeamId(teamId)) {
    notFound();
  }

  const team = TEAMS.find((item) => item.id === teamId);
  if (!team) {
    notFound();
  }

  const allMatches = await getMatches();
  const session = await getServerSession(authOptions);
  const currentGoogleSub = session?.user?.googleSub;
  const currentProfile = currentGoogleSub
    ? await getProfileByGoogleSub(currentGoogleSub)
    : null;
  const teamMatches = allMatches.filter(
    (match) => match.homeTeamId === team.id || match.awayTeamId === team.id,
  );
  const upcomingMatches = teamMatches
    .filter((match) => match.status === 'upcoming' || match.status === 'live')
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  const recentResults = teamMatches
    .filter((match) => match.status === 'finished')
    .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())
    .slice(0, 5);

  const supporters = await getSupportersByTeamId(teamId as TeamId);
  const nextKickoff = upcomingMatches[0]?.kickoff ?? null;
  const teamStory = getTeamStory(team.id, team.name);
  const fanMessage = getFanMessage({
    supportersCount: supporters.length,
    currentTeamId: team.id,
    viewerTeamId: currentProfile?.fan_team_id ?? null,
    viewerName: currentProfile?.username ?? session?.user?.name ?? null,
    isLoggedIn: Boolean(session?.user),
  });

  return (
    <div className="app">
      <AppHeaderSession />
      <main className="app-main">
        <div className="ml-page teams-page">
          <section className="team-detail-header" style={{ '--team-accent': team.color } as CSSProperties}>
            <div className="team-detail-brand">
              <TeamLogoImage src={team.logo} alt={`${team.name} logo`} className="team-detail-logo" />
              <div>
                <h1 className="team-detail-title">{team.name}</h1>
                <p className="team-detail-subtitle">Supporters ({supporters.length})</p>
              </div>
            </div>
            <Link href="/teams" className="team-back-link">
              Back to all teams
            </Link>
          </section>

          <section className="team-story-card" aria-label={`${team.name} introduction and history`}>
            <div className="team-section-head">
              <h2 className="team-section-title">Introduction</h2>
              <p className="team-section-subtitle">{teamStory.intro}</p>
            </div>
            <div className="team-story-history">
              <h3 className="team-story-title">Club History</h3>
              <p className="team-story-text">{teamStory.history}</p>
            </div>
          </section>

          <section className="team-insights-grid" aria-label={`${team.name} overview`}>
            <article className="team-insight-card">
              <h2 className="team-insight-title">Club Snapshot</h2>
              <dl className="team-insight-list">
                <div>
                  <dt>Club</dt>
                  <dd>{team.name}</dd>
                </div>
                <div>
                  <dt>Slug</dt>
                  <dd>{team.id}</dd>
                </div>
                <div>
                  <dt>Community Supporters</dt>
                  <dd>{supporters.length}</dd>
                </div>
                <div>
                  <dt>Tracked Fixtures</dt>
                  <dd>{teamMatches.length}</dd>
                </div>
              </dl>
            </article>

            <article className="team-insight-card">
              <h2 className="team-insight-title">Match Outlook</h2>
              <dl className="team-insight-list">
                <div>
                  <dt>Upcoming / Live</dt>
                  <dd>{upcomingMatches.length}</dd>
                </div>
                <div>
                  <dt>Recent Results</dt>
                  <dd>{recentResults.length}</dd>
                </div>
                <div>
                  <dt>Next Kickoff</dt>
                  <dd>{nextKickoff ? formatDateTime(nextKickoff) : 'No upcoming fixture found'}</dd>
                </div>
              </dl>
            </article>
          </section>

          <section className="team-section" aria-label="Upcoming matches">
            <div className="team-section-head">
              <h2 className="team-section-title">Upcoming Matches</h2>
              <p className="team-section-subtitle">
                Fixtures where {team.name} is scheduled to play.
              </p>
            </div>
            {upcomingMatches.length === 0 ? (
              <p className="supporters-empty">No upcoming matches are currently available.</p>
            ) : (
              <div className="fixtures-list">
                {upcomingMatches.map((match) => (
                  <article key={match.id} className="fixture-card">
                    <div className="fixture-row">
                      <span className="fixture-teams">{formatMatchup(match, team.id)}</span>
                      <span className={`fixture-status is-${match.status}`}>{toStatusLabel(match.status)}</span>
                    </div>
                    <div className="fixture-meta">
                      <span>{match.competition}</span>
                      <span>{formatDateTime(match.kickoff)}</span>
                      <span>{match.venue || 'Venue TBD'}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="team-section" aria-label="Recent results">
            <div className="team-section-head">
              <h2 className="team-section-title">Recent Results</h2>
              <p className="team-section-subtitle">Latest completed matches for {team.name}.</p>
            </div>
            {recentResults.length === 0 ? (
              <p className="supporters-empty">No recent completed matches found.</p>
            ) : (
              <div className="fixtures-list">
                {recentResults.map((match) => (
                  <article key={match.id} className="fixture-card">
                    <div className="fixture-row">
                      <span className="fixture-teams">{formatMatchup(match, team.id)}</span>
                      <span className="fixture-score">
                        {match.homeScore ?? 0} - {match.awayScore ?? 0}
                      </span>
                    </div>
                    <div className="fixture-meta">
                      <span>{match.competition}</span>
                      <span>{formatDateTime(match.kickoff)}</span>
                      <span>{match.venue || 'Venue TBD'}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="team-clan-banner" aria-label="Supporter call to action">
            <h2 className="team-clan-banner-title">{fanMessage.title}</h2>
            <p className="team-clan-banner-text">{fanMessage.description}</p>
          </section>

          <section className="team-section" aria-label={`${team.name} supporters`}>
            <div className="team-section-head">
              <h2 className="team-section-title">Supporters</h2>
              <p className="team-section-subtitle">
                Fans currently backing {team.name}.
              </p>
            </div>
            <div className="supporters-list">
              {supporters.length === 0 ? (
                <p className="supporters-empty">No supporters found yet.</p>
              ) : (
                supporters.map((supporter) => (
                  <Link
                    key={supporter.google_sub}
                    href={`/profile/${encodeURIComponent(supporter.google_sub)}`}
                    className="supporter-card"
                  >
                    <span className="supporter-avatar" aria-hidden>
                      {supporter.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={supporter.image} alt="" />
                      ) : (
                        supporter.username[0]?.toUpperCase() ?? '?'
                      )}
                    </span>
                    <span className="supporter-meta">
                      <span className="supporter-name">{supporter.username}</span>
                      {supporter.city && (
                        <span className="supporter-city">
                          <span className="supporter-city-icon" aria-hidden>
                            📍
                          </span>
                          <span>{supporter.city}</span>
                        </span>
                      )}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function toStatusLabel(status: Match['status']): string {
  if (status === 'live') return 'Live';
  if (status === 'finished') return 'Finished';
  return 'Upcoming';
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMatchup(match: Match, teamId: TeamId): string {
  const isHome = match.homeTeamId === teamId;
  const opponent = isHome ? match.awayTeam.shortName : match.homeTeam.shortName;
  return `${isHome ? 'vs' : '@'} ${opponent}`;
}

interface TeamStory {
  intro: string;
  history: string;
}

function getTeamStory(teamId: TeamId, teamName: string): TeamStory {
  const stories: Partial<Record<TeamId, TeamStory>> = {
    arsenal: {
      intro: 'Arsenal blends technical football with fearless wing play, making every home game feel electric.',
      history: 'Founded in 1886, Arsenal grew into one of England\'s most decorated clubs, highlighted by multiple league titles and the iconic Invincibles season.',
    },
    chelsea: {
      intro: 'Chelsea is built on intensity, big-game mentality, and a crowd that expects silverware every season.',
      history: 'Since their 1905 formation, Chelsea rose from London mainstay to European power, collecting league crowns and Champions League triumphs.',
    },
    liverpool: {
      intro: 'Liverpool thrives on high energy, pressing football, and one of the loudest atmospheres in world football.',
      history: 'Founded in 1892, Liverpool became a global giant through domestic dominance and historic European nights under the Anfield lights.',
    },
    'manchester-united': {
      intro: 'Manchester United represents drama, youth, and attacking flair, with fans who live for late winners.',
      history: 'Established in 1878, United built a legendary legacy through title runs, academy stars, and unforgettable Champions League comebacks.',
    },
    'manchester-city': {
      intro: 'Manchester City combines control and creativity, often turning matches into tactical masterclasses.',
      history: 'Formed in 1880, City evolved into a modern-era powerhouse with sustained league dominance and major European success.',
    },
    tottenham: {
      intro: 'Spurs are known for front-foot football, quick transitions, and a fanbase that values style as much as results.',
      history: 'Founded in 1882, Tottenham has a proud tradition of cup success and attacking football, earning a distinct identity in English football.',
    },
  };

  return (
    stories[teamId] ?? {
      intro: `${teamName} has a passionate fanbase and a matchday culture that makes every fixture feel like an event.`,
      history: `${teamName} has built its identity through decades of domestic competition, memorable rivalries, and loyal supporters across generations.`,
    }
  );
}

interface FanMessageInput {
  supportersCount: number;
  currentTeamId: TeamId;
  viewerTeamId: TeamId | null;
  viewerName: string | null;
  isLoggedIn: boolean;
}

function getFanMessage(input: FanMessageInput): { title: string; description: string } {
  if (input.supportersCount === 0) {
    if (!input.isLoggedIn) {
      return {
        title: 'Be the first supporter in this clan',
        description: 'No supporters yet. Sign in, pick this team, and kickstart the clan.',
      };
    }

    if (!input.viewerTeamId) {
      return {
        title: 'No supporters yet, you can start this clan',
        description: 'Complete your profile and select this team to become the founding supporter.',
      };
    }

    if (input.viewerTeamId === input.currentTeamId) {
      return {
        title: 'You are the first clan member',
        description: `Great shout ${input.viewerName ?? 'fan'} - invite others to join your team clan.`,
      };
    }

    return {
      title: 'No supporters yet, claim this clan',
      description: 'You currently support another team. Invite new fans of this club to kickstart this clan.',
    };
  }

  if (!input.isLoggedIn) {
    return {
      title: 'Join your clan',
      description: 'Supporters are active here. Sign in and pick this team to join the clan.',
    };
  }

  if (!input.viewerTeamId) {
    return {
      title: 'Join your clan',
      description: 'Supporters are already here. Complete your profile and choose this team to join them.',
    };
  }

  if (input.viewerTeamId === input.currentTeamId) {
    return {
      title: 'You are in your clan',
      description: `You already support this team${input.viewerName ? `, ${input.viewerName}` : ''}. Back your clan and bring more fans in.`,
    };
  }

  return {
    title: 'Join your clan',
    description: 'You currently support another team. Cheer this club with the community and invite fans to grow this clan.',
  };
}
