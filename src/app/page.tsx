'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { startGoogleSignInRedirect } from '@/lib/google-signin';
import MatchList from '@/components/MatchList';
import MatchRoom from '@/components/MatchRoom';
import OnboardingModal from '@/components/OnboardingModal';
import AppHeader from '@/components/AppHeader';
import SiteFooter from '@/components/SiteFooter';
import LandingHome from '@/components/LandingHome';

import type { Match, User, TeamId } from '@/lib/types';
import './page.css';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

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

export default function Home() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingMatch, setPendingMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/me');
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data: ProfileResponse = await res.json();
      if (data.profile) {
        setUser(mapProfileToUser(data.profile));
        setShowOnboarding(!data.isOnboardingComplete);
      } else {
        setUser(null);
        setShowOnboarding(true);
      }
    } catch {
      setUser(null);
      setShowOnboarding(true);
    }
  }, []);

  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      // Logged-in users go to the matches page
      router.replace('/matches');
      return;
    }
    setUser(null);
    setShowOnboarding(false);
  }, [session, loadProfile, router]);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/matches');
      const data: Match[] = await res.json();
      setMatches(data);
    } catch (err) {
      console.error('Failed to fetch matches', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 15000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const handleSelectMatch = (match: Match) => {
    if (sessionStatus === 'loading') return;

    if (!session?.user) {
      setPendingMatch(match);
      void startGoogleSignInRedirect();
      return;
    }

    if (!user || !user.fanTeamId) {
      setPendingMatch(match);
      setShowOnboarding(true);
      return;
    }
    setActiveMatch(match);
  };

  useEffect(() => {
    if (!pendingMatch || !session?.user) return;
    if (!user) {
      setShowOnboarding(true);
      return;
    }
    setActiveMatch(pendingMatch);
    setPendingMatch(null);
  }, [pendingMatch, session, user]);

  const handleOnboardingComplete = async (payload: OnboardingPayload) => {
    const res = await fetch('/api/profile/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? 'Failed to save profile');
    }
    const newUser = mapProfileToUser(data.profile);
    setUser(newUser);
    setShowOnboarding(false);
    if (pendingMatch) {
      setActiveMatch(pendingMatch);
      setPendingMatch(null);
    }
  };

  const handleBack = () => {
    setActiveMatch(null);
    fetchMatches();
  };

  const scrollToMatchRooms = useCallback(() => {
    document.getElementById('match-rooms')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const isInRoom = activeMatch && user;

  const handleSignOut = () => {
    setUser(null);
    setActiveMatch(null);
    signOut();
  };

  return (
    <div className="app">
      <AppHeader
        variant="home"
        onLogoClick={handleBack}
        inRoom={!!isInRoom}
        homeActions={{
          installPrompt: !!installPrompt,
          onInstall: handleInstall,
          user,
          onSignOut: handleSignOut,
          showGoogleSignIn: sessionStatus === 'unauthenticated',
          onSignInWithGoogle: () => void startGoogleSignInRedirect(),
        }}
      />

      <main className="app-main">
        {isInRoom ? (
          <MatchRoom match={activeMatch!} user={user!} onBack={handleBack} />
        ) : (
          <>
            <LandingHome onEnterFanGround={scrollToMatchRooms} onSeeLiveRooms={scrollToMatchRooms} />
            <section id="match-rooms" className="landing-match-section">
              <MatchList
                matches={matches}
                user={user}
                onSelectMatch={handleSelectMatch}
                isLoading={isLoading}
              />
            </section>
          </>
        )}
      </main>

      <SiteFooter />

      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          onClose={() => { setShowOnboarding(false); setPendingMatch(null); }}
        />
      )}
    </div>
  );
}
