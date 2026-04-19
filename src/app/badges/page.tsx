import Link from 'next/link';
import { Heart, MessageSquare } from 'lucide-react';
import AppHeaderSession from '@/components/AppHeaderSession';
import SiteFooter from '@/components/SiteFooter';
import EarlyAdopterBadge from '@/components/EarlyAdopterBadge';
import TeamLogoImage from '@/components/TeamLogoImage';
import {
  EARLY_ADOPTER_MAX,
  FOUNDING_FAN_BRONZE_COUNT,
  FOUNDING_FAN_GOLD_COUNT,
  FOUNDING_FAN_SILVER_COUNT,
  getBadgesPageData,
  type LeaderboardProfile,
} from '@/lib/profile-repo';
import { TEAMS } from '@/lib/teams';
import '../page.css';
import '../leaderboard/leaderboard.css';
import './badges.css';

export const dynamic = 'force-dynamic';

const FOUNDING_SILVER_TOTAL = FOUNDING_FAN_GOLD_COUNT + FOUNDING_FAN_SILVER_COUNT;
const FOUNDING_BRONZE_TOTAL = FOUNDING_SILVER_TOTAL + FOUNDING_FAN_BRONZE_COUNT;
const SAMPLE_TEAM = TEAMS[0]!;

function formatMemberSince(value?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function BadgeRoster({
  people,
  extraLine,
}: {
  people: LeaderboardProfile[];
  extraLine?: (p: LeaderboardProfile) => string;
}) {
  if (people.length === 0) {
    return <p className="badge-directory-count">No supporters qualify yet.</p>;
  }
  return (
    <ul className="badge-directory-roster" aria-label="Supporters with this badge">
      {people.map((p) => {
        const team = TEAMS.find((t) => t.id === p.fan_team_id) ?? null;
        const displayName = p.full_name?.trim() || p.username;
        const letter = displayName[0]?.toUpperCase() ?? '?';
        const extra = extraLine?.(p);
        return (
          <li key={p.google_sub} className="badge-roster-item">
            <Link href={`/profile/${encodeURIComponent(p.username)}`} className="badge-roster-link">
              <span className="badge-roster-avatar" aria-hidden>
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" />
                ) : (
                  letter
                )}
              </span>
              <span className="badge-roster-meta">
                <span className="badge-roster-name">{displayName}</span>
                <span className="badge-roster-sub">
                  @{p.username}
                  {extra ? ` · ${extra}` : ` · Since ${formatMemberSince(p.created_at)}`}
                </span>
              </span>
              {team && (
                <span className="badge-roster-team">
                  <TeamLogoImage src={team.logo} alt="" className="badge-roster-team-logo" />
                  {team.name}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function BadgesPage() {
  const {
    earlyAdopters,
    foundingGold,
    foundingSilver,
    foundingBronze,
    mostMessagesLeaders,
    mostReactionsLeaders,
  } = await getBadgesPageData();

  const maxMessages = mostMessagesLeaders[0]?.messagesSent ?? 0;
  const maxReactions = mostReactionsLeaders[0]?.reactionsReceived ?? 0;

  return (
    <div className="app">
      <AppHeaderSession />
      <main className="app-main">
        <div className="ml-page badge-directory-page">
          <nav className="badge-directory-nav" aria-label="Site sections">
            <Link href="/matches" className="badge-directory-nav-link">
              Matches
            </Link>
            <span className="badge-directory-nav-sep" aria-hidden>
              ·
            </span>
            <Link href="/leaderboard" className="badge-directory-nav-link">
              Leaderboard
            </Link>
          </nav>

          <header className="badge-directory-intro">
            <h1>Badges</h1>
            <p>
              Every recognition on FanGround in one place: what it means, how you earn it, and who holds it right now.
            </p>
          </header>

          <section className="badge-directory-section" aria-labelledby="early-adopter-heading">
            <div className="badge-directory-sample">
              <span className="badge-directory-sample-label">Badge</span>
              <EarlyAdopterBadge eligible={true} />
            </div>
            <h2 id="early-adopter-heading">Early Adopter</h2>
            <ul className="badge-directory-rules">
              <li>
                Awarded to the first {EARLY_ADOPTER_MAX} supporters platform-wide, ordered by member since date (earliest
                first).
              </li>
              <li>
                If two accounts share the same join timestamp, a stable internal account id is used as a tiebreaker so
                the cap stays fair.
              </li>
            </ul>
            <p className="badge-directory-count">
              {earlyAdopters.length} of {EARLY_ADOPTER_MAX} slots filled
            </p>
            <BadgeRoster people={earlyAdopters} />
          </section>

          <section className="badge-directory-section" aria-labelledby="founding-fan-heading">
            <div className="badge-directory-sample badge-directory-sample--row">
              <span className="badge-directory-sample-label">Appearances</span>
              <span className="badge-directory-sample-badges" aria-hidden>
                <span className="leaderboard-badge leaderboard-badge--founding-gold">
                  <TeamLogoImage src={SAMPLE_TEAM.logo} alt="" className="leaderboard-badge-team-logo" />
                  <span className="leaderboard-badge-text">Founding Fan</span>
                </span>
                <span className="leaderboard-badge leaderboard-badge--founding-silver">
                  <TeamLogoImage src={SAMPLE_TEAM.logo} alt="" className="leaderboard-badge-team-logo" />
                  <span className="leaderboard-badge-text">Founding Fan</span>
                </span>
                <span className="leaderboard-badge leaderboard-badge--founding-bronze">
                  <TeamLogoImage src={SAMPLE_TEAM.logo} alt="" className="leaderboard-badge-team-logo" />
                  <span className="leaderboard-badge-text">Founding Fan</span>
                </span>
              </span>
            </div>
            <h2 id="founding-fan-heading">Founding Fan</h2>
            <p className="badge-directory-lead">
              Per team, supporters are ranked by when they picked that team (member since). The same “Founding Fan”
              label uses gold, silver, or bronze styling for your highest tier.
            </p>
            <ul className="badge-directory-rules">
              <li>
                <strong>Gold</strong> — among the first {FOUNDING_FAN_GOLD_COUNT} on the team.
              </li>
              <li>
                <strong>Silver</strong> — among the first {FOUNDING_SILVER_TOTAL} on the team (ranks{' '}
                {FOUNDING_FAN_GOLD_COUNT + 1}–{FOUNDING_SILVER_TOTAL}).
              </li>
              <li>
                <strong>Bronze</strong> — among the first {FOUNDING_BRONZE_TOTAL} on the team (ranks{' '}
                {FOUNDING_SILVER_TOTAL + 1}–{FOUNDING_BRONZE_TOTAL}).
              </li>
            </ul>

            <div className="badge-directory-tier-grid">
              <div className="badge-directory-tier-block">
                <h3>Gold ({foundingGold.length})</h3>
                <BadgeRoster people={foundingGold} />
              </div>
              <div className="badge-directory-tier-block">
                <h3>Silver ({foundingSilver.length})</h3>
                <BadgeRoster people={foundingSilver} />
              </div>
              <div className="badge-directory-tier-block">
                <h3>Bronze ({foundingBronze.length})</h3>
                <BadgeRoster people={foundingBronze} />
              </div>
            </div>
          </section>

          <section className="badge-directory-section" aria-labelledby="most-messages-heading">
            <div className="badge-directory-sample">
              <span className="badge-directory-sample-label">Badge</span>
              <span className="leaderboard-badge leaderboard-badge--messages">
                <MessageSquare size={13} aria-hidden />
                <span className="leaderboard-badge-text">Most Messages</span>
              </span>
            </div>
            <h2 id="most-messages-heading">Most Messages</h2>
            <ul className="badge-directory-rules">
              <li>Everyone tied for the highest total chat messages sent across the whole platform.</li>
              <li>Updates as new messages are posted; ties can include multiple people.</li>
            </ul>
            <p className="badge-directory-count">
              {mostMessagesLeaders.length} holder{mostMessagesLeaders.length !== 1 ? 's' : ''}
              {maxMessages > 0 ? ` · high score ${maxMessages}` : ''}
            </p>
            <BadgeRoster
              people={mostMessagesLeaders}
              extraLine={(p) => `${p.messagesSent} messages sent`}
            />
          </section>

          <section className="badge-directory-section" aria-labelledby="most-reactions-heading">
            <div className="badge-directory-sample">
              <span className="badge-directory-sample-label">Badge</span>
              <span className="leaderboard-badge leaderboard-badge--reactions">
                <Heart size={13} aria-hidden />
                <span className="leaderboard-badge-text">Most Reactions</span>
              </span>
            </div>
            <h2 id="most-reactions-heading">Most Reactions</h2>
            <ul className="badge-directory-rules">
              <li>Everyone tied for the highest total reactions received on their chat messages, platform-wide.</li>
              <li>Updates as reactions change; ties can include multiple people.</li>
            </ul>
            <p className="badge-directory-count">
              {mostReactionsLeaders.length} holder{mostReactionsLeaders.length !== 1 ? 's' : ''}
              {maxReactions > 0 ? ` · high score ${maxReactions}` : ''}
            </p>
            <BadgeRoster
              people={mostReactionsLeaders}
              extraLine={(p) => `${p.reactionsReceived} reactions received`}
            />
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
