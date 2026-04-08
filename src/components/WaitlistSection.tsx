'use client';

import { useState, useRef, FormEvent } from 'react';
import './WaitlistSection.css';

interface WaitlistSectionProps {
  /** e.g. `wl--landing` for full-width marketing embed */
  className?: string;
}

export default function WaitlistSection({ className }: WaitlistSectionProps) {
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

          {/* <p className="wl-footnote">Uses FormSubmit through /api/waitlist.</p> */}
        </form>
      </div>
    </section>
  );
}
