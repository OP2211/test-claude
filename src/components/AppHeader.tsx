'use client';

import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/Logo';
import type { User } from '@/lib/types';
import '@/app/page.css';

export interface AppHeaderHomeActionsProps {
  installPrompt: boolean;
  onInstall: () => void;
  user: User | null;
  onSignOut: () => void;
}

interface AppHeaderProps {
  /** When set, logo is a button (e.g. home: leave match room). Otherwise logo links to `logoHref`. */
  onLogoClick?: () => void;
  logoHref?: string;
  inRoom?: boolean;
  /** Home: install + profile + logout. Profile: logout only. */
  variant: 'home' | 'profile' | 'simple';
  homeActions?: AppHeaderHomeActionsProps;
  onProfileSignOut?: () => void;
}

export default function AppHeader({
  onLogoClick,
  logoHref = '/',
  inRoom = false,
  variant,
  homeActions,
  onProfileSignOut,
}: AppHeaderProps) {
  const logoLabel = onLogoClick ? 'Back to matches' : 'FanGround home';

  return (
    <header className={`app-header ${inRoom ? 'in-room' : ''}`}>
      <div className="app-header-inner">
        {onLogoClick ? (
          <button type="button" className="logo-btn" onClick={onLogoClick} aria-label={logoLabel}>
            <Logo size={30} />
            <span className="logo-text">FanGround</span>
          </button>
        ) : (
          <Link className="logo-btn" href={logoHref} aria-label={logoLabel}>
            <Logo size={30} />
            <span className="logo-text">FanGround</span>
          </Link>
        )}

        <div className="header-right">
          {variant === 'home' && homeActions && (
            <>
              {homeActions.installPrompt && (
                <button className="install-btn" onClick={homeActions.onInstall} type="button">
                  <span className="install-icon">+</span>
                  Install
                </button>
              )}
              {homeActions.user && (
                <>
                  <Link href="/profile">
                    <button className="user-avatar-btn" type="button" aria-label="Open profile">
                      {homeActions.user.image ? (
                        <Image src={homeActions.user.image} alt="Profile picture" width={32} height={32} />
                      ) : (
                        <span className="user-avatar-letter">{homeActions.user.username?.[0]?.toUpperCase()}</span>
                      )}
                    </button>
                  </Link>
                  <button
                    className="logout-btn"
                    type="button"
                    onClick={homeActions.onSignOut}
                    aria-label="Log out"
                  >
                    Log out
                  </button>
                </>
              )}
            </>
          )}

          {variant === 'profile' && onProfileSignOut && (
            <button className="logout-btn" type="button" onClick={onProfileSignOut} aria-label="Log out">
              Log out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
