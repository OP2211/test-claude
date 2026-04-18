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
import { TEAM_PROFILES } from '@/lib/team-trophies';
import { getEspnTeamId, fetchTeamRemainingFixtures, fetchTeamRecentResults } from '@/lib/espn';
import type { TeamId } from '@/lib/types';
import '../../page.css';
import '../teams.css';

interface TeamDetailPageProps {
  params: { teamId: string };
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { teamId } = params;
  if (!isValidTeamId(teamId)) notFound();
  const team = TEAMS.find((item) => item.id === teamId);
  if (!team) notFound();

  const profile = TEAM_PROFILES.find(p => p.id === teamId);
  const allMatches = await getMatches();
  const session = await getServerSession(authOptions);
  const currentGoogleSub = session?.user?.googleSub;
  const currentProfile = currentGoogleSub ? await getProfileByGoogleSub(currentGoogleSub) : null;

  // Fetch remaining season fixtures + last 5 results from ESPN
  const espnId = getEspnTeamId(teamId);
  const [remainingFixtures, recentResults] = await Promise.all([
    espnId ? fetchTeamRemainingFixtures(espnId) : Promise.resolve([]),
    espnId ? fetchTeamRecentResults(espnId) : Promise.resolve([]),
  ]);

  const supporters = await getSupportersByTeamId(teamId as TeamId);
  const story = getTeamStory(team.id, team.name);
  const fanMessage = getFanMessage({
    supportersCount: supporters.length,
    currentTeamId: team.id,
    viewerTeamId: currentProfile?.fan_team_id ?? null,
    viewerName: currentProfile?.username ?? session?.user?.name ?? null,
    isLoggedIn: Boolean(session?.user),
  });

  const trophies = profile?.plEraTrophies ?? [];
  const trophyTotal = profile?.plEraTotalCount ?? 0;

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
          <Link href="/teams" className="mp-tab active" aria-current="page">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
            Teams
          </Link>
          <Link href="/leaderboard" className="mp-tab">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10"/><path d="M17 4v3a5 5 0 0 1-10 0V4"/><path d="M5 6H3a2 2 0 0 0 2 2"/><path d="M19 6h2a2 2 0 0 1-2 2"/></svg>
            Leaderboard
          </Link>
        </nav>

        <div className="ml-page td-page">
          {/* ── Hero header ──────────────────────────────────── */}
          <section className="td-hero" style={{ '--td-color': team.color } as CSSProperties}>
            <div className="td-hero-bg" />
            <Link href="/teams" className="td-back" aria-label="Back to all teams">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              All Teams
            </Link>
            <div className="td-hero-content">
              <div className="td-hero-top">
                <TeamLogoImage src={team.logo} alt={`${team.name} logo`} className="td-hero-logo" />
                <div className="td-hero-info">
                  <h1 className="td-hero-name">{team.name}</h1>
                  <p className="td-hero-meta">
                    {profile?.nickname ?? team.name}
                    <span className="td-hero-sep">&middot;</span>
                    Est. {profile?.founded ?? '—'}
                  </p>
                  <p className="td-hero-venue">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18"/><path d="M5 9v9m14-9v9"/><path d="M3 18h18"/><path d="m8 9 2-4h4l2 4"/></svg>
                    {profile?.stadium ?? '—'} ({profile?.capacity ?? '—'})
                  </p>
                </div>
              </div>
              <div className="td-hero-stats">
                <div className="td-hero-stat">
                  <span className="td-hero-stat-num">{supporters.length}</span>
                  <span className="td-hero-stat-label">Supporters</span>
                </div>
                <div className="td-hero-stat">
                  <span className="td-hero-stat-num">{trophyTotal}</span>
                  <span className="td-hero-stat-label">PL Era Trophies</span>
                </div>
                <div className="td-hero-stat">
                  <span className="td-hero-stat-num">{profile?.manager ?? '—'}</span>
                  <span className="td-hero-stat-label">Manager</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Trophy Carousel ──────────────────────────────── */}
          {trophyTotal > 0 ? (
            <section className="td-trophies" aria-label="Trophy cabinet">
              <h2 className="td-section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10"/><path d="M17 4v3a5 5 0 0 1-10 0V4"/><path d="M5 6H3a2 2 0 0 0 2 2"/><path d="M19 6h2a2 2 0 0 1-2 2"/></svg>
                Premier League Era Trophies
                <span className="td-trophy-badge">{trophyTotal}</span>
              </h2>
              <div className="td-trophy-scroll">
                {trophies.map(t => (
                  <div key={t.type} className="td-trophy-card" style={{ '--td-color': team.color } as CSSProperties}>
                    <div className="td-trophy-img-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.image} alt={t.type} className="td-trophy-img" />
                    </div>
                    <div className="td-trophy-text">
                      <span className="td-trophy-count">{t.years.length}</span>
                      <span className="td-trophy-type">{t.type}</span>
                      <span className="td-trophy-years">{t.years.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="td-trophies-empty">
              <p>No major trophies in the Premier League era (1992–2022)</p>
            </section>
          )}

          {/* ── About ────────────────────────────────────────── */}
          <section className="td-about">
            <h2 className="td-section-title">About {team.name}</h2>
            <p className="td-about-intro">{story.intro}</p>
            <details className="td-expandable">
              <summary className="td-expand-btn">View more</summary>
              <div className="td-expand-content">
                <p>{story.history}</p>
                <p>{story.extra}</p>
              </div>
            </details>
          </section>

          {/* ── Remaining Season Fixtures (horizontal scroll) ── */}
          <section className="td-section">
            <h2 className="td-section-title">
              Remaining Fixtures
              {remainingFixtures.length > 0 && <span className="td-count">{remainingFixtures.length}</span>}
            </h2>
            {remainingFixtures.length === 0 ? (
              <p className="td-empty">No remaining fixtures found for this season.</p>
            ) : (
              <div className="td-fixture-scroll">
                {remainingFixtures.map(fix => (
                  <Link key={fix.id} href={`/matches/${fix.id}`} className="td-fixture-scroll-card">
                    <TeamLogoImage src={fix.opponentLogo} alt="" className="td-fixture-scroll-logo" />
                    <span className="td-fixture-scroll-opp">{fix.isHome ? 'vs' : '@'} {fix.opponent}</span>
                    <span className="td-fixture-scroll-date">{formatDate(fix.date)}</span>
                    <span className="td-fixture-scroll-time">{formatTime(fix.date)}</span>
                    {fix.venue && <span className="td-fixture-scroll-venue">{fix.venue}</span>}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ── Recent Results (horizontal scroll) ─────────── */}
          <section className="td-section">
            <h2 className="td-section-title">
              Recent Results
              {recentResults.length > 0 && <span className="td-count">{recentResults.length}</span>}
            </h2>
            {recentResults.length === 0 ? (
              <p className="td-empty">No recent results.</p>
            ) : (
              <div className="td-results-scroll">
                {recentResults.map(r => {
                  const ourScore = r.isHome ? r.homeScore : r.awayScore;
                  const theirScore = r.isHome ? r.awayScore : r.homeScore;
                  const outcome = ourScore > theirScore ? 'w' : ourScore < theirScore ? 'l' : 'd';
                  return (
                    <div key={r.id} className={`td-result-card is-${outcome}`}>
                      <TeamLogoImage src={r.opponentLogo} alt="" className="td-result-logo" />
                      <span className="td-result-score">{r.homeScore} - {r.awayScore}</span>
                      <span className="td-result-opp">{r.isHome ? 'vs' : '@'} {r.opponent}</span>
                      <span className="td-result-date">{formatDate(r.date)}</span>
                      <span className="td-result-badge">{outcome === 'w' ? 'W' : outcome === 'l' ? 'L' : 'D'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Supporters ────────────────────────────────────── */}
          <section className="td-section">
            <h2 className="td-section-title">
              Community
              {supporters.length > 0 && <span className="td-count">{supporters.length} fans</span>}
            </h2>

            <div className="td-clan-banner" style={{ '--td-color': team.color } as CSSProperties}>
              <h3 className="td-clan-title">{fanMessage.title}</h3>
              <p className="td-clan-text">{fanMessage.description}</p>
            </div>

            {supporters.length > 0 && (
              <div className="td-supporters">
                {supporters.map(s => (
                  <Link key={s.google_sub} href={`/profile/${encodeURIComponent(s.google_sub)}`} className="td-supporter">
                    <span className="td-supporter-avatar">
                      {s.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.image} alt="" />
                      ) : (
                        s.username[0]?.toUpperCase() ?? '?'
                      )}
                    </span>
                    <span className="td-supporter-name">{s.username}</span>
                    {s.city && <span className="td-supporter-city">{s.city}</span>}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

interface TeamStory { intro: string; history: string; extra: string; }

function getTeamStory(teamId: TeamId, teamName: string): TeamStory {
  const stories: Partial<Record<TeamId, TeamStory>> = {
    arsenal: {
      intro: 'Arsenal Football Club is one of the most successful and iconic clubs in English football history. Known as "The Gunners," the North London side has built a reputation for attractive, free-flowing football that has captivated fans across generations. Under legendary manager Arsene Wenger, Arsenal achieved the unprecedented feat of going an entire Premier League season unbeaten in 2003-04, earning the squad the immortal nickname "The Invincibles."',
      history: 'Founded in 1886 as Dial Square by munitions workers at the Royal Arsenal in Woolwich, the club relocated to Highbury in 1913 and became the dominant force of the 1930s under Herbert Chapman. The club won five league titles and two FA Cups before World War II. The post-war era saw another golden age with the 1970-71 Double under Bertie Mee.',
      extra: 'The Wenger revolution transformed Arsenal into a global brand, with the move to the Emirates Stadium in 2006 cementing their status as one of the Premier League\'s "Big Six." The club\'s academy has produced world-class talent from Tony Adams and Liam Brady to Jack Wilshere and Bukayo Saka. Under Mikel Arteta, Arsenal have returned to title contention, blending youth with tactical sophistication.',
    },
    chelsea: {
      intro: 'Chelsea Football Club has transformed from a well-supported London club into one of the most successful teams in European football. Based at Stamford Bridge since 1905, the Blues have won every major domestic and European trophy, establishing themselves as perennial contenders under a succession of world-class managers from Jose Mourinho to Thomas Tuchel.',
      history: 'Chelsea was founded in 1905 and spent much of its early decades as a mid-table side with occasional cup runs. The 1955 league title was a landmark moment, but it was the arrival of Roman Abramovich in 2003 that completely transformed the club\'s trajectory, ushering in an era of sustained success and global recruitment.',
      extra: 'The club\'s Champions League triumph in 2012, crowned by Didier Drogba\'s dramatic penalty, remains one of the most emotional nights in football history. Chelsea\'s academy at Cobham has also become a production line, developing players like John Terry, Mason Mount, and Reece James. The club continues to invest heavily in its squad under new ownership.',
    },
    liverpool: {
      intro: 'Liverpool Football Club is synonymous with passion, history, and some of the most dramatic nights in world football. From the terraces of the Kop to the famous "You\'ll Never Walk Alone" anthem, everything about this club is steeped in emotion and tradition. Liverpool\'s six Champions League titles make them one of the most decorated clubs in European history.',
      history: 'Founded in 1892 following a dispute at Anfield, Liverpool rose to become England\'s most successful club through the 1970s and 1980s under Bill Shankly, Bob Paisley, and Joe Fagan. The club won 11 league titles and four European Cups in an extraordinary 20-year period that established the "Liverpool Way" — a commitment to winning with style and togetherness.',
      extra: 'The tragic events at Hillsborough in 1989 deeply affected the club and its community, but Liverpool\'s spirit endured. The 2005 Champions League final in Istanbul — coming back from 3-0 down against AC Milan — is regarded as the greatest comeback in football history. Under Jurgen Klopp, Liverpool won the Champions League in 2019 and ended a 30-year wait for a league title in 2020.',
    },
    'manchester-united': {
      intro: 'Manchester United is the most decorated club in English football history and one of the biggest sporting brands in the world. Built on a philosophy of attacking football, youth development, and never-say-die spirit, United\'s legacy under Sir Alex Ferguson created the template for modern football dominance. Old Trafford, the "Theatre of Dreams," has hosted some of the most iconic moments in the sport.',
      history: 'Originally formed as Newton Heath LYR Football Club in 1878 by railway workers, the club was renamed Manchester United in 1902 after being saved from bankruptcy. The Busby Babes of the 1950s captured the imagination before the tragic Munich air disaster of 1958 claimed eight players. Sir Matt Busby rebuilt the team, culminating in the 1968 European Cup triumph.',
      extra: 'Sir Alex Ferguson\'s 26-year reign (1986-2013) is the greatest managerial dynasty in football. He won 13 Premier League titles, five FA Cups, and two Champions League trophies, including the legendary 1999 Treble. The "Class of 92" — Beckham, Scholes, Giggs, the Nevilles, and Butt — epitomised the club\'s youth-first philosophy. Post-Ferguson, United have sought to recapture that magic while remaining one of the world\'s most valuable sporting franchises.',
    },
    'manchester-city': {
      intro: 'Manchester City have undergone one of the most remarkable transformations in football history, evolving from a yo-yo club between divisions into the dominant force in English football. Under the visionary management of Pep Guardiola, City play a brand of possession-based football that has redefined what is possible in the Premier League, winning six titles in seven seasons.',
      history: 'Founded in 1880 as St. Mark\'s (West Gorton), the club became Manchester City in 1894. Early success came with FA Cup wins in 1904 and 1934, and league titles in 1937 and 1968 under Joe Mercer and Malcolm Allison. However, the club endured decades of inconsistency, including a stint in the third tier of English football in 1998-99.',
      extra: 'The 2008 acquisition by the Abu Dhabi United Group transformed City\'s fortunes entirely. Sergio Aguero\'s last-minute title-winning goal in 2012 — "AGUEROOOO!" — remains the most dramatic moment in Premier League history. Under Guardiola since 2016, City have achieved unprecedented consistency, completing the Treble in 2022-23 with Premier League, FA Cup, and Champions League victories.',
    },
    tottenham: {
      intro: 'Tottenham Hotspur, known as Spurs, represent the pride of North London with a rich tradition of entertaining, attack-minded football. The club\'s magnificent 62,850-capacity stadium, opened in 2019, stands as a testament to their ambition. While major trophies have been elusive in recent decades, Spurs consistently compete at the highest level and boast one of the most passionate fanbases in England.',
      history: 'Founded in 1882 by schoolboys from the Hotspur Cricket Club, Tottenham became the first club in the 20th century to achieve the League and FA Cup Double in 1960-61 under the legendary Bill Nicholson. They won the first-ever UEFA Cup in 1972 and added another in 1984.',
      extra: 'The club\'s modern era has been defined by near-misses and moments of brilliance — from Gareth Bale\'s Champions League exploits to the remarkable 2018-19 run to the Champions League final under Mauricio Pochettino. Harry Kane became the club\'s all-time leading scorer before his departure, while the new stadium has positioned Spurs as a global entertainment destination.',
    },
    'aston-villa': {
      intro: 'Aston Villa are one of the founding members of the Football League and one of the most historic clubs in English football. Based in Birmingham, Villa\'s proud heritage includes a European Cup triumph in 1982 and seven league titles. Under Unai Emery, the club has returned to European competition and established themselves as genuine contenders for Champions League qualification.',
      history: 'Founded in 1874 by members of the Villa Cross Wesleyan Chapel cricket team, Aston Villa were one of the most dominant clubs of the Victorian and Edwardian eras, winning six league titles between 1894 and 1910. The club was a founding member of both the Football League (1888) and the Premier League (1992).',
      extra: 'Villa\'s greatest night came in 1982 when Peter Withe\'s goal defeated Bayern Munich in the European Cup final in Rotterdam. After decades of ups and downs — including relegation to the Championship in 2016 — the club has been revitalised under ambitious ownership. The appointment of Unai Emery in 2022 sparked a remarkable resurgence that took Villa back into the Champions League.',
    },
    everton: {
      intro: 'Everton Football Club are one of the grand old clubs of English football, having spent more seasons in the top flight than any other team. Known as "The Toffees," Everton\'s Goodison Park has been a fortress for over 130 years, though the club is set to move to a stunning new stadium at Bramley-Moore Dock. Despite recent struggles, Everton\'s history and fanbase remain among the most respected in the game.',
      history: 'Founded in 1878 as St Domingo FC, Everton were founder members of the Football League in 1888 and have won nine league titles and five FA Cups throughout their history. The 1980s saw a golden era under Howard Kendall, with two league titles and a European Cup Winners\' Cup.',
      extra: 'Everton\'s rivalry with Liverpool — the Merseyside derby — is one of the most intense in football. The club has produced iconic players from Dixie Dean to Wayne Rooney, and its commitment to community work through Everton in the Community is widely recognised as the best in professional sport.',
    },
  };

  return stories[teamId] ?? {
    intro: `${teamName} is a proud member of the Premier League with a passionate fanbase that brings incredible energy to every matchday. The club\'s commitment to competitive football and community engagement has earned them respect across English football, with supporters who are among the most loyal and vocal in the country.`,
    history: `${teamName} has built its identity through decades of domestic competition, developing a distinct playing style and producing memorable moments that have defined eras. From dramatic cup runs to hard-fought league campaigns, the club\'s journey through English football is one of determination and resilience.`,
    extra: `In the modern era, ${teamName} continues to evolve — investing in player development, stadium infrastructure, and fan engagement to compete at the highest level. The club\'s academy has been a source of homegrown talent, while strategic signings have strengthened the squad\'s ability to compete in one of the most demanding leagues in world football.`,
  };
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
    if (!input.isLoggedIn) return { title: 'Be the first supporter', description: 'Sign in and pick this team to start the clan.' };
    if (!input.viewerTeamId) return { title: 'Start this clan', description: 'Complete your profile and select this team to become the founding supporter.' };
    if (input.viewerTeamId === input.currentTeamId) return { title: 'You are the first', description: `Great shout ${input.viewerName ?? 'fan'} — invite others to join your clan.` };
    return { title: 'Claim this clan', description: 'Invite fans of this club to kickstart the community.' };
  }
  if (!input.isLoggedIn) return { title: 'Join the clan', description: 'Sign in and pick this team to join the community.' };
  if (!input.viewerTeamId) return { title: 'Join the clan', description: 'Complete your profile to join the supporters.' };
  if (input.viewerTeamId === input.currentTeamId) return { title: 'You are in the clan', description: `Back your team${input.viewerName ? `, ${input.viewerName}` : ''} and bring more fans in.` };
  return { title: 'Join the clan', description: 'Connect with supporters of this club.' };
}
