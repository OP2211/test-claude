import type { Metadata } from 'next';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import SiteFooter from '@/components/SiteFooter';
import '../page.css';
import '../legal-doc.css';

export const metadata: Metadata = {
  title: 'Terms of Service — FanGround',
  description: 'Terms of Service for FanGround, the live football fan hub.',
};

export default function TermsPage() {
  return (
    <div className="app">
      <AppHeader variant="simple" />

      <main className="app-main">
        <article className="legal-doc">
          <h1>Terms of Service</h1>
          <p className="legal-updated">Last updated: April 2, 2026</p>

          <div className="legal-card">
            <p>
              These Terms of Service (“Terms”) govern your access to and use of FanGround (“we,” “us,” or “our”) and our
              website, apps, and related services (collectively, the “Service”). By using the Service, you agree to these
              Terms. If you do not agree, do not use the Service.
            </p>
          </div>

          <section>
            <h2>Eligibility &amp; accounts</h2>
            <p>
              You must be able to form a binding contract where you live. You are responsible for your account
              credentials and for all activity under your account. You agree to provide accurate information and to keep
              it updated.
            </p>
          </section>

          <section>
            <h2>The Service</h2>
            <p>
              FanGround provides a fan-focused experience around football matches, including chat, reactions, and
              related features. Features may change, be suspended, or discontinued. We do not guarantee uninterrupted or
              error-free operation.
            </p>
          </section>

          <section>
            <h2>Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Harass, threaten, or harm others, or post unlawful, hateful, or abusive content</li>
              <li>Impersonate others or misrepresent your affiliation</li>
              <li>Spam, scrape, or attempt to disrupt or overload the Service</li>
              <li>Reverse engineer or circumvent security or access controls</li>
              <li>Use the Service in violation of applicable law or third-party rights</li>
            </ul>
          </section>

          <section>
            <h2>User content</h2>
            <p>
              You retain rights to content you submit. You grant us a worldwide, non-exclusive license to host, store,
              display, and distribute your content as needed to operate and improve the Service. You represent that you
              have the rights to grant this license.
            </p>
          </section>

          <section>
            <h2>Termination</h2>
            <p>
              We may suspend or terminate access if you violate these Terms or if we need to protect the Service or
              other users. You may stop using the Service at any time.
            </p>
          </section>

          <section>
            <h2>Disclaimers</h2>
            <p>
              The Service is provided “as is” and “as available,” without warranties of any kind, express or implied,
              including merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section>
            <h2>Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, we are not liable for indirect, incidental, special,
              consequential, or punitive damages, or for loss of profits, data, or goodwill. Our total liability for any
              claim arising from the Service is limited to the greater of fifty dollars (USD) or the amounts you paid us
              for the Service in the twelve months before the claim (if any).
            </p>
          </section>

          <section>
            <h2>Changes</h2>
            <p>
              We may update these Terms from time to time. We will post the updated Terms and revise the “Last updated”
              date. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about these Terms can be sent through the contact or support channels we provide for FanGround.
            </p>
          </section>

          <nav className="legal-links" aria-label="Related policies">
            <Link href="/privacy">Privacy Policy</Link>
          </nav>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
