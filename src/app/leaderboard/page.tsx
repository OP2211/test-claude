import { Suspense } from 'react';
import AppHeaderSession from '@/components/AppHeaderSession';
import SiteFooter from '@/components/SiteFooter';
import LeaderboardClient from '@/components/LeaderboardClient';
import LeaderboardNav from '@/components/LeaderboardNav';
import '../page.css';
import './leaderboard.css';

export const dynamic = 'force-dynamic';

export default function LeaderboardPage() {
  return (
    <div className="app">
      <AppHeaderSession />
      <main className="app-main">
        <Suspense fallback={<nav className="mp-tabs" aria-label="Page sections" />}>
          <LeaderboardNav />
        </Suspense>
        <div className="ml-page leaderboard-page">
          <LeaderboardClient />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
