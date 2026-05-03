'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import AppHeader from '@/components/AppHeader';
import CricketMatchRoom from '@/components/CricketMatchRoom';
import OnboardingModal from '@/components/OnboardingModal';
import type { CricketMatch } from '@/lib/cricket/types';
import type { User, TeamId } from '@/lib/types';
import { fetchProfileMeShared } from '@/lib/fetch-profile-me-client';
import {
  clearStoredReferralCode, getStoredReferralCode, storeReferralCodeFromQuery,
} from '@/lib/referral-storage';
import '../../../page.css';
import '../../../matches/matches.css';

interface ProfileResponse {
  profile: {
    google_sub: string;
    full_name: string | null;
    email: string | null;
    image: string | null;
    username: string;
    phone: string;
    fan_team_id: TeamId | null;
    cricket_fan_team_id: TeamId | null;
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
  referralCode?: string;
}

function getPreferredSessionAvatar(image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  return image.includes('/storage/v1/object/public/') ? image : undefined;
}

function mapProfileToUser(p: NonNullable<ProfileResponse['profile']>): User {
  return {
    userId: p.google_sub,
    googleSub: p.google_sub,
    username: p.username?.trim() || p.full_name?.trim() || 'fan',
    profileUsername: p.username,
    email: p.email ?? undefined,
    image: p.image ?? undefined,
    fanTeamId: p.fan_team_id,
    cricketFanTeamId: p.cricket_fan_team_id,
    phone: p.phone,
    dob: p.dob,
    city: p.city,
  };
}

function CricketMatchDetailsInner() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams<{ matchId: string }>();
  const matchId = params?.matchId;
  const [user, setUser] = useState<User | null>(null);
  const [match, setMatch] = useState<CricketMatch | null>(null);
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
          image: getPreferredSessionAvatar(session.user.image),
        }
      : null
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    storeReferralCodeFromQuery(params.get('ref'));
  }, []);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.replace('/');
  }, [sessionStatus, router]);

  const loadProfile = useCallback(async () => {
    try {
      const { ok, data } = await fetchProfileMeShared();
      if (!ok) { setUser(null); setShowOnboarding(true); return; }
      const profileData = data as ProfileResponse;
      if (profileData.profile) {
        setUser(mapProfileToUser(profileData.profile));
        if (!profileData.isOnboardingComplete) setShowOnboarding(true);
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
      const res = await fetch(`/api/cricket/match?id=${matchId}`, { cache: 'no-store' });
      if (!res.ok) {
        setNotFound(res.status === 404);
        return;
      }
      const data: CricketMatch = await res.json();
      setMatch(data);
      setNotFound(false);
    } catch {
      setNotFound(false);
    } finally {
      setLoadingMatch(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (session?.user) void loadProfile();
  }, [session, loadProfile]);

  useEffect(() => { void loadMatch(); }, [loadMatch]);

  const handleOnboardingComplete = async (payload: OnboardingPayload) => {
    const referralCode = getStoredReferralCode();
    // Cricket sport here → the modal returns an IPL team in fanTeamId; rename to cricketFanTeamId.
    const { fanTeamId, ...rest } = payload;
    const res = await fetch('/api/profile/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...rest,
        cricketFanTeamId: fanTeamId,
        referralCode,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to save profile');
    clearStoredReferralCode();
    setUser(mapProfileToUser(data.profile));
    setShowOnboarding(false);
  };

  const handleBack = () => { router.push('/cricket/matches'); };

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
        <main className="app-main mp-detail-main">
          <div className="mp-empty">
            <p className="ml-empty-text">Match not found</p>
            <p className="ml-empty-sub">This room may no longer be available.</p>
          </div>
        </main>
      </div>
    );
  }

  if (!user || (!user.fanTeamId && !user.cricketFanTeamId)) {
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
            sport="cricket"
            onComplete={handleOnboardingComplete}
            onClose={() => {
              setShowOnboarding(false);
              router.push('/cricket/matches');
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
      <main className="app-main mp-detail-main">
        <CricketMatchRoom match={match} user={user} onBack={handleBack} />
      </main>
    </div>
  );
}

export default function CricketMatchDetailsPage() {
  return (
    <Suspense fallback={<div className="mp-loading-full"><div className="mp-spinner" /></div>}>
      <CricketMatchDetailsInner />
    </Suspense>
  );
}
