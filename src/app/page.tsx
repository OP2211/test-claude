'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/app/AuthContext';
import { openGoogleSignInPopup } from '@/lib/google-signin-popup';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import MatchList from '@/components/MatchList';
import MatchRoom from '@/components/MatchRoom';
import OnboardingModal from '@/components/OnboardingModal';
import AuthModal from '@/components/AuthModal';
import AppHeader from '@/components/AppHeader';
import SiteFooter from '@/components/SiteFooter';
import LandingHome from '@/components/LandingHome';
import type { Match, User, TeamId, ProfileRow } from '@/lib/types';
import './page.css';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function generateUserId(): string {
  return 'user-' + Math.random().toString(36).slice(2, 10);
}

export default function Home() {
  const { session, loading: authLoading, refreshSession, signOut } = useAuth();
  const { data: nextAuthSession, update: updateNextAuthSession } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingMatch, setPendingMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!session?.user && nextAuthSession?.user) {
      setUser({
        userId: generateUserId(),
        username: nextAuthSession.user.name ?? 'Fan',
        email: nextAuthSession.user.email ?? '',
        image: nextAuthSession.user.image ?? '',
        fanTeamId: null,
        mobileNumber: '',
        name: nextAuthSession.user.name ?? 'Fan',
      });
      setShowAuthModal(true);
      return;
    }

    if (!session?.user) {
      setUser(null);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    void supabase
      .from('profiles')
      .select('id, username, email, avatar_url, team')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setUser({
            userId: session.user.id,
            username: session.user.user_metadata?.name ?? 'Fan',
            email: session.user.email ?? '',
            image: session.user.user_metadata?.avatar_url ?? '',
            fanTeamId: null,
            mobileNumber: '',
            name: session.user.user_metadata?.name ?? 'Fan',
          });
          setShowAuthModal(true);
          return;
        }
        const profile = data as ProfileRow;
        setUser({
          userId: profile.id,
          username: profile.username,
          email: profile.email,
          image: profile.avatar_url ?? '',
          fanTeamId: profile.team as TeamId,
          mobileNumber: profile.mobile_number ?? '',
          name: profile.name,
        });
      });
  }, [session, nextAuthSession]);

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
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const handleSelectMatch = (match: Match) => {
    if (authLoading) return;

    if (!session?.user && !nextAuthSession?.user) {
      setPendingMatch(match);
      setShowAuthModal(true);
      return;
    }

    if (!user) {
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
  }, [pendingMatch, session, nextAuthSession, user]);

  const handleOnboardingComplete = (fanTeamId: TeamId, devUsername?: string) => {
    const newUser: User = {
      userId: session?.user?.id ?? generateUserId(),
      username: devUsername || user?.username || session?.user?.user_metadata?.name || '',
      email: session?.user?.email ?? user?.email ?? '',
      image: user?.image ?? '',
      fanTeamId,
      mobileNumber: user?.mobileNumber ?? '',
      name: user?.name ?? session?.user?.user_metadata?.name ?? '',
    };
    localStorage.setItem('ffc_user', JSON.stringify(newUser));
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
    void signOut();
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
          showGoogleSignIn: !session && !nextAuthSession,
          onSignInWithGoogle: () =>
            void openGoogleSignInPopup(() => {
              void updateNextAuthSession();
              void refreshSession();
              setShowAuthModal(true);
            }),
          onSignIn: () => setShowAuthModal(true),
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
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          forceProfileSetup={
            (!!session && !!user && (!user.mobileNumber || !user.fanTeamId)) ||
            (!!nextAuthSession && !!user && (!user.mobileNumber || !user.fanTeamId))
          }
          onCompleteProfile={async (profile) => {
            setUser((prev) => ({
              userId: prev?.userId ?? generateUserId(),
              username: profile.username,
              email: profile.email,
              image: profile.avatarUrl ?? prev?.image ?? '',
              fanTeamId: profile.team,
              mobileNumber: profile.mobileNumber,
              name: profile.name,
            }));
          }}
          onSuccess={() => {
            setShowAuthModal(false);
            void refreshSession();
          }}
        />
      )}
    </div>
  );
}
