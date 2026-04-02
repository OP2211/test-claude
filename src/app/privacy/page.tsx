import type { Metadata } from 'next';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import SiteFooter from '@/components/SiteFooter';
import '../page.css';
import '../legal-doc.css';

export const metadata: Metadata = {
  title: 'Privacy Policy — FanGround',
  description: 'Privacy Policy for FanGround, the live football fan hub.',
};

export default function PrivacyPage() {
  return (
    <div className="app">
      <AppHeader variant="simple" />

      <main className="app-main">
        <article className="legal-doc">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: April 2, 2026</p>

          <div className="legal-card">
            <p>
              This Privacy Policy describes how FanGround (“we,” “us,” or “our”) collects, uses, and shares information
              when you use our website, apps, and related services (collectively, the “Service”).
            </p>
          </div>

          <section>
            <h2>Information we collect</h2>
            <p>We may collect:</p>
            <ul>
              <li>
                <strong>Account data:</strong> such as name, email address, and profile image,
                when you sign in with a provider (for example, Google) or create an account.
              </li>
              <li>
                <strong>Content you submit:</strong> messages, reactions, predictions, and other
                content you post in match rooms or related features.
              </li>
              <li>
                <strong>Technical data:</strong> such as device type, browser, approximate
                location derived from IP, and usage events (for example, pages viewed and interactions).
              </li>
              <li>
                <strong>Cookies &amp; similar technologies:</strong> to keep sessions, remember
                preferences, and understand how the Service is used.
              </li>
            </ul>
          </section>

          <section>
            <h2>How we use information</h2>
            <p>We use information to:</p>
            <ul>
              <li>Provide, maintain, and improve the Service</li>
              <li>Authenticate users and personalize your experience</li>
              <li>Moderate content, enforce our Terms, and protect safety and security</li>
              <li>Communicate with you about the Service (for example, support or important notices)</li>
              <li>Analyze usage in aggregate to improve features and reliability</li>
            </ul>
          </section>

          <section>
            <h2>Sharing</h2>
            <p>
              We may share information with service providers who assist us (for example, hosting, authentication, or
              analytics), when required by law, or to protect rights and safety. Content you post in public areas of the
              Service may be visible to other users.
            </p>
          </section>

          <section>
            <h2>Retention</h2>
            <p>
              We retain information as long as needed to provide the Service and for legitimate business purposes such
              as security, legal compliance, and dispute resolution.
            </p>
          </section>

          <section>
            <h2>Security</h2>
            <p>
              We use reasonable technical and organizational measures to protect information. No method of transmission
              or storage is completely secure.
            </p>
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              Depending on where you live, you may have rights to access, correct, delete, or export personal data, or
              to object to or restrict certain processing. Contact us to exercise applicable rights.
            </p>
          </section>

          <section>
            <h2>Children</h2>
            <p>
              The Service is not directed at children under 13 (or the age required in your jurisdiction). We do not
              knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2>International transfers</h2>
            <p>
              We may process information in countries other than where you live. Where required, we use appropriate
              safeguards for cross-border transfers.
            </p>
          </section>

          <section>
            <h2>Changes</h2>
            <p>
              We may update this policy from time to time. We will post the updated policy and revise the “Last updated”
              date.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              For privacy-related requests or questions, contact us through the support or contact options we provide for
              FanGround.
            </p>
          </section>

          <nav className="legal-links" aria-label="Related policies">
            <Link href="/terms">Terms of Service</Link>
          </nav>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
