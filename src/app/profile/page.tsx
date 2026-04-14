'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { openGoogleSignInPopup } from '@/lib/google-signin-popup';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import SiteFooter from '@/components/SiteFooter';
import { TEAMS } from '@/lib/teams';
import '../page.css';
import './profile.css';

interface ProfileData {
  username: string;
  phone: string;
  fan_team_id: string;
  dob: string | null;
  city: string | null;
}

export default function Profile() {
  const { data: session, status, update: updateSession } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileError, setProfileError] = useState<string>('');

  useEffect(() => {
    if (!session) return;
    const fetchProfile = async () => {
      setProfileError('');
      try {
        const res = await fetch('/api/profile/me');
        const data = await res.json();
        if (!res.ok) {
          setProfile(null);
          setProfileError(data.error ?? 'Failed to load profile details');
          return;
        }
        setProfile(data.profile ?? null);
      } catch {
        setProfile(null);
        setProfileError('Failed to load profile details');
      }
    };
    void fetchProfile();
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="app">
        <AppHeader variant="simple" />
        <main className="app-main">
          <div className="ml-page">
            <p className="profile-status-msg">Loading…</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app">
        <AppHeader variant="simple" />

        <main className="app-main">
          <div className="ml-page">
            <div className="profile-page">
              <div className="profile-header">
                <div>
                  <h1 className="profile-title">Profile</h1>
                  <p className="profile-subtitle">Sign in to view your account details.</p>
                </div>
              </div>

              <div className="profile-empty">
                <p>You’re not signed in.</p>
                <button
                  type="button"
                  className="google-signin-btn google-signin-btn--wide"
                  onClick={() => void openGoogleSignInPopup(() => updateSession())}
                  aria-label="Sign in with Google"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
                <Link href="/">Go home</Link>
              </div>
            </div>
          </div>
        </main>

        <SiteFooter />
      </div>
    );
  }

  const name = session.user?.name ?? 'Fan';
  const email = session.user?.email ?? '—';
  const image = session.user?.image ?? '';
  const selectedTeam = profile?.fan_team_id
    ? (TEAMS.find((team) => team.id === profile.fan_team_id) ?? null)
    : null;

  return (
    <div className="app">
      <AppHeader
        variant="profile"
        profileMenu={{
          image: session.user?.image ?? null,
          name: session.user?.name ?? 'Fan',
          onSignOut: () => {
            localStorage.removeItem('ffc_user');
            void signOut();
          },
        }}
      />

      <main className="app-main">
        <div className="ml-page">
          <div className="profile-page">
            <div className="profile-header">
              <div>
                <h1 className="profile-title">Profile</h1>
                <p className="profile-subtitle">Manage your FanGround account.</p>
              </div>
            </div>

            <section className="profile-card" aria-label="Profile details">
              <div className="profile-card-top">
                <div className="profile-identity">
                  <div className="profile-avatar" aria-label="Profile picture">
                    {image ? (
                      <Image src={image} alt="Profile picture" width={96} height={96} priority />
                    ) : (
                      <span className="profile-avatar-letter">{name?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="profile-name">{name}</div>
                    <div className="profile-email">{email}</div>
                    <div
                      className={`profile-team-pill ${selectedTeam ? '' : 'is-placeholder'}`}
                      style={{ '--team-pill-color': selectedTeam?.color ?? '#5d6d85' } as React.CSSProperties}
                      aria-label={selectedTeam ? `${selectedTeam.name}` : 'Support badge'}
                    >
                      <span className="profile-team-pill-dot" />
                      {selectedTeam?.logo ? (
                        <img src={selectedTeam.logo} alt="" className="profile-team-pill-logo" />
                      ) : (
                        <span className="profile-team-pill-logo-placeholder" aria-hidden />
                      )}
                      <span className="profile-team-pill-text">
                        {selectedTeam ? `${selectedTeam.name}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-card-body">
                <div className="profile-row">
                  <div className="profile-row-label">Username</div>
                  <div className="profile-row-value">{profile?.username ?? '—'}</div>
                </div>
                <div className="profile-row">
                  <div className="profile-row-label">Email</div>
                  <div className="profile-row-value">{email}</div>
                </div>
                <div className="profile-row">
                  <div className="profile-row-label">Phone</div>
                  <div className="profile-row-value">{profile?.phone ?? '—'}</div>
                </div>
                <div className="profile-row">
                  <div className="profile-row-label">Selected team</div>
                  <div className="profile-row-value">
                    {selectedTeam ? (
                      <span className="profile-team-value">
                        <img src={selectedTeam.logo} alt={`${selectedTeam.name} logo`} className="profile-team-value-logo" />
                        <span>{selectedTeam.name}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
                <div className="profile-row">
                  <div className="profile-row-label">Date of birth</div>
                  <div className="profile-row-value">{profile?.dob ?? '—'}</div>
                </div>
                <div className="profile-row">
                  <div className="profile-row-label">City</div>
                  <div className="profile-row-value">{profile?.city ?? '—'}</div>
                </div>
                {profileError && (
                  <div className="profile-row">
                    <div className="profile-row-label">Status</div>
                    <div className="profile-row-value">{profileError}</div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
