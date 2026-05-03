import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import AppHeaderSession from '@/components/AppHeaderSession';
import SiteFooter from '@/components/SiteFooter';
import TeamLogoImage from '@/components/TeamLogoImage';
import EarlyAdopterBadge from '@/components/EarlyAdopterBadge';
import {
  getFoundingFanTierForSupporter,
  getPublicProfileByIdOrUsername,
  getReferralSnapshotByGoogleSub,
} from '@/lib/profile-repo';
import { getTeamInfo, TEAMS } from '@/lib/teams';
import '../../page.css';
import '../profile.css';
import './public-profile.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PublicProfilePageProps {
  params: {
    idOrUsername: string;
  };
}

const FOUNDING_FAN_BADGE_CLASS: Record<'founding' | 'silver' | 'bronze', string> = {
  founding: '',
  silver: 'profile-leader-badge--silver',
  bronze: 'profile-leader-badge--bronze',
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const key = decodeURIComponent(params.idOrUsername ?? '').trim();
  if (!key) {
    notFound();
  }

  const profile = await getPublicProfileByIdOrUsername(key);
  if (!profile) {
    notFound();
  }
  const fullName = profile.full_name?.trim() || '—';

  const selectedTeam = TEAMS.find((team) => team.id === profile.fan_team_id) ?? null;
  const cricketTeam = profile.cricket_fan_team_id ? getTeamInfo(profile.cricket_fan_team_id) : null;
  const foundingFanTier = selectedTeam
    ? await getFoundingFanTierForSupporter(profile.google_sub, selectedTeam.id)
    : null;
  const referralSnapshot = await getReferralSnapshotByGoogleSub(profile.google_sub);
  const invitedMembers = referralSnapshot.invitedMembers;
  const avatarFallback = profile.username[0]?.toUpperCase() ?? 'F';

  return (
    <div className="app">
      <AppHeaderSession />
      <main className="app-main">
        <div className="ml-page">
          <div className="profile-page">
            <section className="profile-card" aria-label="Supporter profile">
              <div className="profile-card-top">
                <div className="profile-identity">
                  <div className="profile-avatar" aria-label="Supporter avatar">
                    {profile.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.image} alt={`${profile.username} avatar`} className="public-profile-avatar-img" />
                    ) : (
                      <span className="profile-avatar-letter">{avatarFallback}</span>
                    )}
                  </div>
                  <div>
                    <div className="profile-name">{fullName !== '—' ? fullName : profile.username}</div>
                    <div className="profile-username">@{profile.username}</div>
                    {selectedTeam && (
                      <div
                        className="profile-team-pill"
                        style={{ '--team-pill-color': selectedTeam.color } as CSSProperties}
                        aria-label={`Football: ${selectedTeam.name}`}
                      >
                        <span className="profile-team-pill-dot" aria-hidden>⚽</span>
                        <TeamLogoImage src={selectedTeam.logo} alt="" className="profile-team-pill-logo" />
                        <span className="profile-team-pill-text">{selectedTeam.name}</span>
                      </div>
                    )}
                    {cricketTeam && (
                      <div
                        className="profile-team-pill"
                        style={{ '--team-pill-color': cricketTeam.color } as CSSProperties}
                        aria-label={`Cricket: ${cricketTeam.name}`}
                      >
                        <span className="profile-team-pill-dot" aria-hidden>🏏</span>
                        {cricketTeam.logo
                          ? <TeamLogoImage src={cricketTeam.logo} alt="" className="profile-team-pill-logo" />
                          : null}
                        <span className="profile-team-pill-text">{cricketTeam.name}</span>
                      </div>
                    )}
                    <div className="profile-badges">
                      <EarlyAdopterBadge />
                      {foundingFanTier && selectedTeam && (
                        <span
                          className={`profile-leader-badge ${FOUNDING_FAN_BADGE_CLASS[foundingFanTier]}`.trim()}
                          aria-label="Badge: Founding Fan"
                        >
                          <TeamLogoImage src={selectedTeam.logo} alt="" className="profile-leader-badge-logo" />
                          <span>Founding Fan</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-card-body">
                <div className="profile-row">
                  <div className="profile-row-label">Full Name</div>
                  <div className="profile-row-value">{fullName}</div>
                </div>
                <div className="profile-row">
                  <div className="profile-row-label">Username</div>
                  <div className="profile-row-value">@{profile.username}</div>
                </div>
                <div className="profile-row">
                  <div className="profile-row-label">City</div>
                  <div className="profile-row-value">{profile.city ?? '—'}</div>
                </div>
                <div className="profile-row">
                  <div className="profile-row-label">Member Since</div>
                  <div className="profile-row-value">{formatMemberSince(profile.created_at)}</div>
                </div>
                <div className="profile-row">
                  <div className="profile-row-label">Supporter ID</div>
                  <div className="profile-row-value public-profile-id">{profile.google_sub}</div>
                </div>
                <div className="profile-row profile-row--stacked">
                  <div className="profile-row-label">
                    Successfully Invited Users ({invitedMembers.length})
                  </div>
                  <div className="profile-row-value profile-row-value--left">
                    {invitedMembers.length > 0 ? (
                      <div className="public-profile-invited-cards">
                        {invitedMembers.slice(0, 10).map((member) => (
                          <Link
                            key={member.google_sub}
                            href={`/profile/${encodeURIComponent(member.username)}`}
                            className="public-profile-invited-card"
                          >
                            <span className="public-profile-invited-avatar" aria-hidden>
                              {member.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={member.image} alt="" />
                              ) : (
                                <span>{member.username[0]?.toUpperCase() ?? 'F'}</span>
                              )}
                            </span>
                            <span className="public-profile-invited-name">
                              {member.full_name?.trim() || member.username}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      'No successful invites yet.'
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
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
    month: 'short',
    year: 'numeric',
  });
}
