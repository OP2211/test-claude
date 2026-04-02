import type { Metadata } from 'next';
import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';
import './not-found.css';

export const metadata: Metadata = {
  title: 'Page not found — FanGround',
  description: 'This page has been sent off. Head back to the match.',
};

function BallIcon() {
  return (
    <svg className="nf-icon-ball" width="22" height="22" viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="20" stroke="rgba(34,197,94,0.5)" strokeWidth="1.5" fill="none" />
      <circle cx="24" cy="22" r="12" fill="url(#nf-ball-grad)" opacity="0.9" />
      <defs>
        <linearGradient id="nf-ball-grad" x1="12" y1="10" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22C55E" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function NotFound() {
  return (
    <div className="nf-page app">
      <header className="nf-header">
        <Link href="/" className="nf-logo-link">
          <BallIcon />
          FanGround
        </Link>
      </header>

      <main className="nf-main" id="main">
        <div className="nf-scoreboard" aria-labelledby="nf-heading">
          <div className="nf-badge">Whistle blown</div>
          <p className="nf-code" aria-hidden>
            404
          </p>
          <h1 id="nf-heading" className="nf-title">
            <span className="nf-sr-only">404. </span>
            Sent off — wrong end of the pitch
          </h1>
          <p className="nf-copy">
            This URL isn’t on the team sheet. No goal here: the page never made the matchday squad. Head back to
            the stands or take the tunnel home.
          </p>
          <div className="nf-actions">
            <Link href="/" className="nf-btn nf-btn--primary">
              Back to the match
            </Link>
            <Link href="/" className="nf-btn nf-btn--ghost">
              FanGround home
            </Link>
          </div>
        </div>
        <p className="nf-whistle">VAR says: check the address — or we&apos;ll book you for time-wasting.</p>
      </main>

      <SiteFooter />
    </div>
  );
}
