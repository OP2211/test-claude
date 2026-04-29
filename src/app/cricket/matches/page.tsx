'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import SiteFooter from '@/components/SiteFooter';
import OnboardingModal from '@/components/OnboardingModal';
import CricketMatchList from '@/components/CricketMatchList';
import { fetchProfileMeShared } from '@/lib/fetch-profile-me-client';
import {
  clearStoredReferralCode, getStoredReferralCode, storeReferralCodeFromQuery,
} from '@/lib/referral-storage';
import type { CricketMatch } from '@/lib/cricket/types';
import type { User, TeamId } from '@/lib/types';
import '../../page.css';
import '../../matches/matches.css';
import './cricket-matches.css';

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
    username: p.full_name?.trim() || p.username,
    email: p.email ?? undefined,
    image: p.image ?? undefined,
    fanTeamId: p.fan_team_id,
    phone: p.phone,
    dob: p.dob,
    city: p.city,
  };
}

function CricketMatchesPageInner() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<CricketMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

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
    if (sessionStatus === 'unauthenticated') router.replace('/');
  }, [sessionStatus, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    storeReferralCodeFromQuery(params.get('ref'));
  }, []);

  const loadProfile = useCallback(async () => {
    setIsProfileLoading(true);
    try {
      const { ok, data } = await fetchProfileMeShared();
      if (!ok) { setUser(null); return; }
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
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) void loadProfile();
  }, [session, loadProfile]);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/cricket/matches', { cache: 'no-store' });
      if (res.ok) {
        const data: CricketMatch[] = await res.json();
        setMatches(data);
      }
    } catch (err) {
      console.error('[cricket matches] fetch failed', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const t = setInterval(fetchMatches, 20_000);
    return () => clearInterval(t);
  }, [fetchMatches]);

  const handleSelectMatch = (match: CricketMatch) => {
    if (isProfileLoading) return;
    if (!user || !user.fanTeamId) {
      setPendingMatchId(match.id);
      setShowOnboarding(true);
      return;
    }
    router.push(`/cricket/matches/${match.id}`);
  };

  const handleOnboardingComplete = async (payload: OnboardingPayload) => {
    const referralCode = getStoredReferralCode();
    const res = await fetch('/api/profile/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, referralCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to save profile');
    clearStoredReferralCode();
    setUser(mapProfileToUser(data.profile));
    setShowOnboarding(false);
    if (pendingMatchId) {
      const next = pendingMatchId;
      setPendingMatchId(null);
      router.push(`/cricket/matches/${next}`);
    }
  };

  const handleSignOut = () => {
    setUser(null);
    signOut({ callbackUrl: '/' });
  };

  if (sessionStatus === 'loading') {
    return <div className="mp-loading-full"><div className="mp-spinner" /></div>;
  }
  if (sessionStatus === 'unauthenticated') return null;

  return (
    <div className="app">
      <AppHeader
        variant="home"
        onLogoClick={() => router.push('/')}
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
        <div className="mp-root">
          <nav className="mp-tabs" aria-label="Page sections">
            <button className="mp-tab active" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Matches
            </button>
            <Link href="/leaderboard" className="mp-tab">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10"/><path d="M17 4v3a5 5 0 0 1-10 0V4"/><path d="M5 6H3a2 2 0 0 0 2 2"/><path d="M19 6h2a2 2 0 0 1-2 2"/></svg>
              Leaderboard
            </Link>
          </nav>

          <div className="ck-matches-hero">
            <div className="ck-matches-hero-eyebrow">Indian Premier League</div>
            <h1 className="ck-matches-hero-title">Cricket</h1>
            <p className="ck-matches-hero-sub">
              Live scores, predictions & banter — same hub, IPL edition.
            </p>
          </div>

          <CricketMatchList
            matches={matches}
            isLoading={isLoading || isProfileLoading}
            onSelectMatch={handleSelectMatch}
            isJoinDisabled={isProfileLoading}
          />
        </div>
      </main>

      <SiteFooter />
      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          onClose={() => {
            setShowOnboarding(false);
            setPendingMatchId(null);
          }}
        />
      )}
    </div>
  );
}

export default function CricketMatchesPage() {
  return (
    <Suspense fallback={<div className="mp-loading-full"><div className="mp-spinner" /></div>}>
      <CricketMatchesPageInner />
    </Suspense>
  );
}
