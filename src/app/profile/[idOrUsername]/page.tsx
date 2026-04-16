import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import AppHeaderSession from '@/components/AppHeaderSession';
import SiteFooter from '@/components/SiteFooter';
import TeamLogoImage from '@/components/TeamLogoImage';
import EarlyAdopterBadge from '@/components/EarlyAdopterBadge';
import { getPublicProfileByIdOrUsername, isTeamLeaderForSupporter } from '@/lib/profile-repo';
import { TEAMS } from '@/lib/teams';
import '../../page.css';
import '../profile.css';
import './public-profile.css';

interface PublicProfilePageProps {
  params: {
    idOrUsername: string;
  };
}

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
  const isTeamLeader = selectedTeam
    ? await isTeamLeaderForSupporter(profile.google_sub, selectedTeam.id)
    : false;
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
                        aria-label={selectedTeam.name}
                      >
                        <span className="profile-team-pill-dot" />
                        <TeamLogoImage src={selectedTeam.logo} alt="" className="profile-team-pill-logo" />
                        <span className="profile-team-pill-text">{selectedTeam.name}</span>
                      </div>
                    )}
                    <div className="profile-badges">
                      <EarlyAdopterBadge />
                      {isTeamLeader && selectedTeam && (
                        <span className="profile-leader-badge" aria-label={`Badge: ${selectedTeam.name} Leader`}>
                          <TeamLogoImage src={selectedTeam.logo} alt="" className="profile-leader-badge-logo" />
                          <span>{selectedTeam.name} Leader</span>
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
