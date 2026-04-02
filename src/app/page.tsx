'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import MatchList from '@/components/MatchList';
import MatchRoom from '@/components/MatchRoom';
import OnboardingModal from '@/components/OnboardingModal';
import Logo from '@/components/Logo';
import type { Match, User, TeamId } from '@/lib/types';
import './page.css';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function generateUserId(): string {
  return 'user-' + Math.random().toString(36).slice(2, 10);
}

export default function Home() {
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingMatch, setPendingMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (session?.user) {
      const { name, email, image } = session.user;
      const saved = localStorage.getItem('ffc_user');
      if (saved) {
        try {
          const existingUser = JSON.parse(saved);
          const newUser = { ...existingUser, username: name, email, image };
          localStorage.setItem('ffc_user', JSON.stringify(newUser));
          setUser(newUser);
        } catch {}
      } else {
        const newUser: User = { userId: generateUserId(), username: name ?? '', email: email ?? '', image: image ?? '', fanTeamId: null };
        localStorage.setItem('ffc_user', JSON.stringify(newUser));
        setUser(newUser);
      }
    } else {
      const saved = localStorage.getItem('ffc_user');
      if (saved) {
        try { setUser(JSON.parse(saved)); } catch {}
      }
    }
  }, [session]);

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
    if (!user) {
      setPendingMatch(match);
      setShowOnboarding(true);
      return;
    }
    setActiveMatch(match);
  };

  const handleOnboardingComplete = (fanTeamId: TeamId) => {
    const newUser: User = { userId: generateUserId(), username: session?.user?.name ?? '', email: session?.user?.email ?? '', image: session?.user?.image ?? '', fanTeamId };
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

  const isInRoom = activeMatch && user;

  return (
    <div className="app">
      <header className={`app-header ${isInRoom ? 'in-room' : ''}`}>
        <div className="app-header-inner">
          <button className="logo-btn" onClick={handleBack}>
            <Logo size={30} />
            <span className="logo-text">FanGround</span>
          </button>
          <div className="header-right">
            {installPrompt && (
              <button className="install-btn" onClick={handleInstall}>
                <span className="install-icon">+</span>
                Install
              </button>
            )}
            {user && (
              <>
                <Link href="/profile">
                  <button className="user-avatar-btn" aria-label="Open profile">
                    {user.image ? (
                      <Image src={user.image} alt="Profile picture" width={32} height={32} />
                    ) : (
                      <span className="user-avatar-letter">{user.username?.[0]?.toUpperCase()}</span>
                    )}
                  </button>
                </Link>
                <button
                  className="logout-btn"
                  onClick={() => {
                    localStorage.removeItem('ffc_user');
                    setUser(null);
                    setActiveMatch(null);
                    signOut();
                  }}
                  aria-label="Log out"
                >
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {isInRoom ? (
          <MatchRoom match={activeMatch!} user={user!} onBack={handleBack} />
        ) : (
          <MatchList
            matches={matches}
            user={user}
            onSelectMatch={handleSelectMatch}
            isLoading={isLoading}
          />
        )}
      </main>

      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          onClose={() => { setShowOnboarding(false); setPendingMatch(null); }}
        />
      )}
    </div>
  );
}
