'use client';

import { useState, useRef, FormEvent } from 'react';
import './WaitlistSection.css';

const WAITLIST_SUBJECT = 'FanGround waitlist signup';

function web3formsErrorMessage(json: unknown): string | undefined {
  if (typeof json !== 'object' || json === null) return undefined;
  const j = json as Record<string, unknown>;
  if (typeof j.message === 'string') return j.message;
  const body = j.body;
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const m = (body as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return undefined;
}

function web3formsOk(json: unknown): boolean {
  return typeof json === 'object' && json !== null && (json as { success?: unknown }).success === true;
}

interface WaitlistSectionProps {
  /** e.g. `wl--landing` for full-width marketing embed */
  className?: string;
}

export default function WaitlistSection({ className }: WaitlistSectionProps) {
  const web3Key = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY?.trim();
  const web3OptIn =
    process.env.NEXT_PUBLIC_WAITLIST_USE_WEB3FORMS === 'true' ||
    process.env.NEXT_PUBLIC_WAITLIST_USE_WEB3FORMS === '1';
  const useWeb3FormsSubmit = Boolean(web3Key && web3OptIn);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [club, setClub] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  /** Checkbox honeypot — text “Company” fields get autofilled by extensions and used to skip the API with a fake success. */
  const botTrapRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    if (botTrapRef.current?.checked) {
      setStatus('success');
      setEmail('');
      setName('');
      setClub('');
      return;
    }

    try {
      if (useWeb3FormsSubmit && web3Key) {
        const details = [
          name && `Name: ${name}`,
          `Email: ${email}`,
          club && `Club / note: ${club}`,
          `Time (UTC): ${new Date().toISOString()}`,
        ]
          .filter(Boolean)
          .join('\n');

        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: web3Key,
            subject: WAITLIST_SUBJECT,
            from_name: name || 'FanGround waitlist',
            email,
            replyto: email,
            message: details,
          }),
        });

        const data: unknown = await res.json().catch(() => null);
        if (!web3formsOk(data)) {
          setStatus('error');
          const msg =
            web3formsErrorMessage(data) ??
            'Could not send. In Web3Forms, allow this domain (e.g. localhost, your Vercel URL) and confirm the inbox tied to your access key.';
          setErrorMessage(msg);
          return;
        }

        setStatus('success');
        setEmail('');
        setName('');
        setClub('');
        return;
      }

      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, club }),
      });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setStatus('error');
        setErrorMessage(payload.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setStatus('success');
      setEmail('');
      setName('');
      setClub('');
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Check your connection and try again.');
    }
  }

  if (status === 'success') {
    return (
      <section className={['wl', className].filter(Boolean).join(' ')} id="waitlist" aria-labelledby="waitlist-heading">
        <div className="wl-inner">
          <div className="wl-success" role="status">
            <span className="wl-success-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
            <h2 id="waitlist-heading" className="wl-title">
              You&apos;re on the list
            </h2>
            <p className="wl-sub">We&apos;ll email you when there&apos;s something new to shout about.</p>
            <button type="button" className="wl-secondary" onClick={() => setStatus('idle')}>
              Join another email
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={['wl', className].filter(Boolean).join(' ')} id="waitlist" aria-labelledby="waitlist-heading">
      <div className="wl-inner">
        <div className="wl-glow" aria-hidden="true" />
        <div className="wl-copy">
          <p className="wl-kicker">Early access</p>
          <h2 id="waitlist-heading" className="wl-title">
            Join the waitlist
          </h2>
          <p className="wl-sub">
            Be first to know about new rooms, features, and matchday drops. No spam — just football.
          </p>
        </div>

        <form className="wl-form" onSubmit={onSubmit} noValidate>
          <label className="wl-visually-hidden" htmlFor="wl-email">
            Email
          </label>
          <input
            id="wl-email"
            className="wl-input wl-input-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
          />

          <div className="wl-row">
            <label className="wl-visually-hidden" htmlFor="wl-name">
              Name (optional)
            </label>
            <input
              id="wl-name"
              className="wl-input"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={status === 'loading'}
            />
            <label className="wl-visually-hidden" htmlFor="wl-club">
              Club or note (optional)
            </label>
            <input
              id="wl-club"
              className="wl-input"
              type="text"
              name="club"
              placeholder="Your club (optional)"
              value={club}
              onChange={(e) => setClub(e.target.value)}
              disabled={status === 'loading'}
            />
          </div>

          {/* Bots often tick every checkbox; humans never see this */}
          <div className="wl-honeypot" aria-hidden="true">
            <input ref={botTrapRef} type="checkbox" name="confirm_hp" tabIndex={-1} defaultChecked={false} />
          </div>

          {status === 'error' && errorMessage && (
            <p className="wl-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button type="submit" className="wl-submit" disabled={status === 'loading'}>
            {status === 'loading' ? (
              <>
                <span className="wl-spinner" aria-hidden="true" />
                Sending…
              </>
            ) : (
              'Request access'
            )}
          </button>

          {/* <p className="wl-footnote">
            {useWeb3FormsSubmit
              ? 'Web3Forms: mail goes to the inbox tied to your access key; allow this domain in the Web3Forms dashboard.'
              : 'Uses FormSubmit: set WAITLIST_NOTIFICATION_EMAIL, activate the link in that inbox once, and set NEXTAUTH_URL or NEXT_PUBLIC_APP_URL (e.g. http://localhost:3000).'}
          </p> */}
        </form>
      </div>
    </section>
  );
}
