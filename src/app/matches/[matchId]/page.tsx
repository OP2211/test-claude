'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import AppHeader from '@/components/AppHeader';
import MatchRoom from '@/components/MatchRoom';
import OnboardingModal from '@/components/OnboardingModal';
import type { Match, User, TeamId } from '@/lib/types';
import '../matches.css';

interface ProfileResponse {
  profile: {
    google_sub: string;
    full_name: string | null;
    email: string | null;
    image: string | null;
    username: string;
    phone: string;
    fan_team_id: TeamId;
    dob: string | null;
    city: string | null;
  } | null;
  isOnboardingComplete: boolean;
}

interface OnboardingPayload {
  username: string;
  phone: string;
  fanTeamId: TeamId;
  dob: string | null;
  city: string | null;
}

function mapProfileToUser(profile: NonNullable<ProfileResponse['profile']>): User {
  return {
    userId: profile.google_sub,
    googleSub: profile.google_sub,
    username: profile.full_name?.trim() || profile.username,
    email: profile.email ?? undefined,
    image: profile.image ?? undefined,
    fanTeamId: profile.fan_team_id,
    phone: profile.phone,
    dob: profile.dob,
    city: profile.city,
  };
}

export default function MatchDetailsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams<{ matchId: string }>();
  const matchId = params?.matchId;
  const [user, setUser] = useState<User | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const headerUser: User | null = user ?? (
    session?.user
      ? {
          userId: session.user.googleSub ?? session.user.email ?? session.user.name ?? 'fan',
          googleSub: session.user.googleSub ?? undefined,
          username: session.user.name ?? 'Fan',
          fanTeamId: null,
          email: session.user.email ?? undefined,
          image: session.user.image ?? undefined,
        }
      : null
  );

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/');
    }
  }, [sessionStatus, router]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/me');
      if (!res.ok) {
        setUser(null);
        setShowOnboarding(true);
        return;
      }
      const data: ProfileResponse = await res.json();
      if (data.profile) {
        setUser(mapProfileToUser(data.profile));
        if (!data.isOnboardingComplete) setShowOnboarding(true);
      } else {
        setUser(null);
        setShowOnboarding(true);
      }
    } catch {
      setUser(null);
      setShowOnboarding(true);
    }
  }, []);

  const loadMatch = useCallback(async () => {
    if (!matchId) return;
    setLoadingMatch(true);
    try {
      const res = await fetch(`/api/match?id=${matchId}`, { cache: 'no-store' });
      if (!res.ok) {
        setNotFound(res.status === 404);
        return;
      }
      const data: Match = await res.json();
      setMatch(data);
      setNotFound(false);
    } catch {
      setNotFound(false);
    } finally {
      setLoadingMatch(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (session?.user) {
      void loadProfile();
    }
  }, [session, loadProfile]);

  useEffect(() => {
    void loadMatch();
  }, [loadMatch]);

  const handleOnboardingComplete = async (payload: OnboardingPayload) => {
    const res = await fetch('/api/profile/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to save profile');
    setUser(mapProfileToUser(data.profile));
    setShowOnboarding(false);
  };

  const handleBack = () => {
    router.push('/matches');
  };

  const handleSignOut = () => {
    setUser(null);
    signOut({ callbackUrl: '/' });
  };

  if (sessionStatus === 'loading' || loadingMatch) {
    return <div className="mp-loading-full"><div className="mp-spinner" /></div>;
  }

  if (sessionStatus === 'unauthenticated') return null;

  if (notFound || !match) {
    return (
      <div className="app">
        <AppHeader
          variant="home"
          onLogoClick={handleBack}
          inRoom={false}
          homeActions={{
            installPrompt: false,
            onInstall: () => {},
            user: headerUser,
            onSignOut: handleSignOut,
            showGoogleSignIn: false,
            onSignInWithGoogle: () => {},
          }}
        />
        <main className="app-main">
          <div className="mp-empty">
            <p className="ml-empty-text">Match not found</p>
            <p className="ml-empty-sub">This room may no longer be available.</p>
          </div>
        </main>
      </div>
    );
  }

  if (!user || !user.fanTeamId) {
    return (
      <div className="app">
        <AppHeader
          variant="home"
          onLogoClick={handleBack}
          inRoom={false}
          homeActions={{
            installPrompt: false,
            onInstall: () => {},
            user: headerUser,
            onSignOut: handleSignOut,
            showGoogleSignIn: false,
            onSignInWithGoogle: () => {},
          }}
        />
        {showOnboarding && (
          <OnboardingModal
            onComplete={handleOnboardingComplete}
            onClose={() => {
              setShowOnboarding(false);
              router.push('/matches');
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <AppHeader
        variant="home"
        onLogoClick={handleBack}
        inRoom
        homeActions={{
          installPrompt: false,
          onInstall: () => {},
          user,
          onSignOut: handleSignOut,
          showGoogleSignIn: false,
          onSignInWithGoogle: () => {},
        }}
      />
      <main className="app-main">
        <MatchRoom match={match} user={user} onBack={handleBack} />
      </main>
    </div>
  );
}
