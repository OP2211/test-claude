import type { Metadata } from 'next';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import SiteFooter from '@/components/SiteFooter';
import './page.css';
import './not-found.css';

export const metadata: Metadata = {
  title: 'Page not found — FanGround',
  description: 'This page has been sent off. Head back to the match.',
};

export default function NotFound() {
  return (
    <div className="nf-page app">
      <AppHeader variant="simple" logoHref="/" />

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
