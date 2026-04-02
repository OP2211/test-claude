'use client';

import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import Logo from '@/components/Logo';
import '../page.css';
import './profile.css';

export default function Profile() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="app-header-inner">
            <Link className="logo-btn" href="/" aria-label="Back to matches">
              <Logo size={30} />
              <span className="logo-text">FanGround</span>
            </Link>
            <div className="header-right" />
          </div>
        </header>

        <main className="app-main">
          <div className="ml-page">
            <div className="profile-page">
              <div className="profile-header">
                <div>
                  <h1 className="profile-title">Profile</h1>
                  <p className="profile-subtitle">Sign in to view your account details.</p>
                </div>
              </div>

              <div className="profile-empty">
                <p>You’re not signed in.</p>
                <Link href="/">Go home</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const name = session.user?.name ?? 'Fan';
  const email = session.user?.email ?? '—';
  const image = session.user?.image ?? '';

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <Link className="logo-btn" href="/" aria-label="Back to matches">
            <Logo size={30} />
            <span className="logo-text">FanGround</span>
          </Link>
          <div className="header-right">
            <button className="logout-btn" onClick={() => signOut()} aria-label="Log out">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="ml-page">
          <div className="profile-page">
            <div className="profile-header">
              <div>
                <h1 className="profile-title">Profile</h1>
                <p className="profile-subtitle">Manage your FanGround account.</p>
              </div>
            </div>

            <section className="profile-card" aria-label="Profile details">
              <div className="profile-card-top">
                <div className="profile-identity">
                  <div className="profile-avatar" aria-label="Profile picture">
                    {image ? (
                      <Image src={image} alt="Profile picture" width={96} height={96} priority />
                    ) : (
                      <span className="profile-avatar-letter">{name?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="profile-name">{name}</div>
                    <div className="profile-email">{email}</div>
                  </div>
                </div>
              </div>

              <div className="profile-card-body">
                <div className="profile-row">
                  <div className="profile-row-label">Name</div>
                  <div className="profile-row-value">{name}</div>
                </div>
                <div className="profile-row">
                  <div className="profile-row-label">Email</div>
                  <div className="profile-row-value">{email}</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
