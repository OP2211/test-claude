'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import SiteFooter from '@/components/SiteFooter';
import OnboardingModal from '@/components/OnboardingModal';
import MatchList from '@/components/MatchList';
import LeagueHub from '@/components/LeagueHub';
import type { Match, User, TeamId } from '@/lib/types';
import type { TopScorer, TopContributor } from '@/lib/espn';
import './matches.css';

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

function getPreferredSessionAvatar(image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  return image.includes('/storage/v1/object/public/') ? image : undefined;
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

type PageTab = 'matches' | 'table' | 'stats';

function StatsTab() {
  const [scorers, setScorers] = useState<TopScorer[]>([]);
  const [assists, setAssists] = useState<TopScorer[]>([]);
  const [contributors, setContributors] = useState<TopContributor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/top-scorers').then(r => r.json()),
      fetch('/api/top-assists').then(r => r.json()),
      fetch('/api/top-contributors').then(r => r.json()),
    ]).then(([s, a, c]) => {
      setScorers(s);
      setAssists(a);
      setContributors(c);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="mp-loading"><div className="mp-spinner" /></div>;
  }

  return (
    <div className="mp-stats">
      <div className="mp-stats-col">
        <h3 className="mp-stats-heading">
          <span className="mp-stats-icon">&#9917;</span>
          Top Scorers
        </h3>
        <div className="mp-stats-list">
          {scorers.map(s => (
            <div key={s.playerId} className="mp-stat-row">
              <span className="mp-stat-rank">{s.rank}</span>
              <img src={s.teamLogo} alt="" className="mp-stat-logo" />
              <div className="mp-stat-info">
                <span className="mp-stat-name">{s.playerName}</span>
                <span className="mp-stat-team">{s.teamName}</span>
              </div>
              <div className="mp-stat-val">
                <span className="mp-stat-num mp-stat-num--gold">{s.goals}</span>
                <span className="mp-stat-label">goals</span>
              </div>
              <div className="mp-stat-val mp-hide-sm">
                <span className="mp-stat-num">{s.assists}</span>
                <span className="mp-stat-label">ast</span>
              </div>
              <div className="mp-stat-val mp-hide-sm">
                <span className="mp-stat-num">{s.appearances}</span>
                <span className="mp-stat-label">app</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mp-stats-col">
        <h3 className="mp-stats-heading">
          <span className="mp-stats-icon">&#127919;</span>
          Top Assists
        </h3>
        <div className="mp-stats-list">
          {assists.map(s => (
            <div key={s.playerId + '-a'} className="mp-stat-row">
              <span className="mp-stat-rank">{s.rank}</span>
              <img src={s.teamLogo} alt="" className="mp-stat-logo" />
              <div className="mp-stat-info">
                <span className="mp-stat-name">{s.playerName}</span>
                <span className="mp-stat-team">{s.teamName}</span>
              </div>
              <div className="mp-stat-val">
                <span className="mp-stat-num mp-stat-num--blue">{s.assists}</span>
                <span className="mp-stat-label">ast</span>
              </div>
              <div className="mp-stat-val mp-hide-sm">
                <span className="mp-stat-num">{s.goals}</span>
                <span className="mp-stat-label">goals</span>
              </div>
              <div className="mp-stat-val mp-hide-sm">
                <span className="mp-stat-num">{s.appearances}</span>
                <span className="mp-stat-label">app</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Contributors (G+A) */}
      {contributors.length > 0 && (
        <div className="mp-stats-full">
          <h3 className="mp-stats-heading">
            <span className="mp-stats-icon">&#11088;</span>
            Top Contributors (G+A)
          </h3>
          <div className="mp-stats-list">
            {contributors.map(c => (
              <div key={c.playerId + '-c'} className="mp-stat-row">
                <span className="mp-stat-rank">{c.rank}</span>
                <img src={c.teamLogo} alt="" className="mp-stat-logo" />
                <div className="mp-stat-info">
                  <span className="mp-stat-name">{c.playerName}</span>
                  <span className="mp-stat-team">{c.teamName}</span>
                </div>
                <div className="mp-stat-val">
                  <span className="mp-stat-num mp-stat-num--green">{c.contributions}</span>
                  <span className="mp-stat-label">G+A</span>
                </div>
                <div className="mp-stat-val">
                  <span className="mp-stat-num">{c.goals}</span>
                  <span className="mp-stat-label">goals</span>
                </div>
                <div className="mp-stat-val">
                  <span className="mp-stat-num">{c.assists}</span>
                  <span className="mp-stat-label">ast</span>
                </div>
                <div className="mp-stat-val mp-hide-sm">
                  <span className="mp-stat-num">{c.appearances}</span>
                  <span className="mp-stat-label">app</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchesPageContent() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestedTab = searchParams.get('tab');
  const queryTab: PageTab =
    requestedTab === 'table' || requestedTab === 'stats' || requestedTab === 'matches'
      ? requestedTab
      : 'matches';
  const [activeTab, setActiveTab] = useState<PageTab>(queryTab);
  const forceOpenMatchesForDebug =
    searchParams.get('debugOpenAll') === '1' ||
    searchParams.get('debugOpenAll') === 'true';
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

  // Redirect to home if not logged in
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/');
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    setActiveTab(queryTab);
  }, [queryTab]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/me');
      if (!res.ok) { setUser(null); return; }
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

  useEffect(() => {
    if (session?.user) {
      void loadProfile();
    }
  }, [session, loadProfile]);

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
    if (!user || !user.fanTeamId) {
      setPendingMatchId(match.id);
      setShowOnboarding(true);
      return;
    }
    router.push(`/matches/${match.id}`);
  };

  const handleOnboardingComplete = async (payload: OnboardingPayload) => {
    const res = await fetch('/api/profile/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to save profile');
    const newUser = mapProfileToUser(data.profile);
    setUser(newUser);
    setShowOnboarding(false);
    if (pendingMatchId) {
      const nextMatchId = pendingMatchId;
      setPendingMatchId(null);
      router.push(`/matches/${nextMatchId}`);
    }
  };

  const handleBack = () => {
    router.push('/matches');
    fetchMatches();
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
        <div className="mp-root">
          {/* Page tabs */}
          <nav className="mp-tabs" aria-label="Page sections">
            <button className={`mp-tab ${activeTab === 'matches' ? 'active' : ''}`} onClick={() => setActiveTab('matches')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Matches
            </button>
            <button className={`mp-tab ${activeTab === 'table' ? 'active' : ''}`} onClick={() => setActiveTab('table')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              Table
            </button>
            <button className={`mp-tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              Stats
            </button>
            <Link href="/teams" className="mp-tab">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
              Teams
            </Link>
          </nav>

          {/* Tab content */}
          {activeTab === 'matches' && (
            <MatchList
              matches={matches}
              user={user}
              onSelectMatch={handleSelectMatch}
              isLoading={isLoading}
              forceOpenAll={forceOpenMatchesForDebug}
            />
          )}
          {activeTab === 'table' && <LeagueHub />}
          {activeTab === 'stats' && <StatsTab />}
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

export default function MatchesPage() {
  return (
    <Suspense fallback={<div className="mp-loading-full"><div className="mp-spinner" /></div>}>
      <MatchesPageContent />
    </Suspense>
  );
}
