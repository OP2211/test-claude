'use client';

import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
import SportSelector from '@/components/SportSelector';
import { LOGOUT_CONFIRM_VARIANTS, pickRandomLogoutVariant } from '@/lib/logout-variants';
import type { User } from '@/lib/types';
import '@/app/page.css';

type ThemePreference = 'light' | 'dark';

const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
};

export interface AppHeaderHomeActionsProps {
  installPrompt: boolean;
  onInstall: () => void;
  user: User | null;
  onSignOut: () => void;
  /** When true (no OAuth session), show Sign in with Google in the header. */
  showGoogleSignIn?: boolean;
  /** While true, show a lightweight loading treatment on the sign-in CTA. */
  isGoogleSignInLoading?: boolean;
  onSignInWithGoogle?: () => void;
}

export interface AppHeaderProfileMenuProps {
  image: string | null;
  name: string;
  onSignOut: () => void;
}

interface AppHeaderProps {
  /** When set, logo is a button (e.g. home: leave match room). Otherwise logo links to `logoHref`. */
  onLogoClick?: () => void;
  logoHref?: string;
  inRoom?: boolean;
  /** Home: install + profile menu. Profile: avatar menu. */
  variant: 'home' | 'profile' | 'simple';
  homeActions?: AppHeaderHomeActionsProps;
  /** Profile: avatar + hover/click menu (replaces always-visible Log out). */
  profileMenu?: AppHeaderProfileMenuProps;
}

function applyThemePreference(pref: ThemePreference | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!pref) {
    root.removeAttribute('data-theme');
    return;
  }
  root.setAttribute('data-theme', pref);
}

function UserAvatarMenu({
  image,
  name,
  onSignOut,
}: {
  image: string | null | undefined;
  name: string;
  onSignOut: () => void;
}) {
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [logoutCopy, setLogoutCopy] = useState<{ title: string; message: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAvatarFailed(false);
  }, [image]);

  useEffect(() => {
    if (!mobileOpen) return;
    if (!window.matchMedia('(hover: none)').matches) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [mobileOpen]);

  const closeLogoutConfirm = useCallback(() => {
    setLogoutConfirm(false);
    setLogoutCopy(null);
  }, []);

  useEffect(() => {
    if (!logoutConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLogoutConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [logoutConfirm, closeLogoutConfirm]);

  const toggleMobile = useCallback(() => {
    if (window.matchMedia('(hover: none)').matches) {
      setMobileOpen((o) => !o);
    }
  }, []);

  const handleLogoutClick = () => {
    setLogoutCopy(pickRandomLogoutVariant());
    setLogoutConfirm(true);
    setMobileOpen(false);
  };

  const confirmLogout = () => {
    closeLogoutConfirm();
    onSignOut();
  };

  const logoutDialogCopy = logoutCopy ?? LOGOUT_CONFIRM_VARIANTS[0];

  const letter = name?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      <div ref={menuRef} className={`user-menu ${mobileOpen ? 'is-open' : ''}`}>
        <button
          type="button"
          className="user-avatar-btn"
          aria-label="Account menu"
          aria-expanded={mobileOpen}
          aria-haspopup="menu"
          onClick={toggleMobile}
        >
          {image && !avatarFailed ? (
            <Image src={image} alt="" width={32} height={32} onError={() => setAvatarFailed(true)} />
          ) : avatarFailed ? (
            <span className="user-avatar-letter">{letter}</span>
          ) : null}
          {!image && (
            <span className="user-avatar-empty" aria-hidden />
          )}
        </button>

        <div className="user-menu-dropdown" role="menu">
          <Link href="/leaderboard" className="user-menu-item" role="menuitem" onClick={() => setMobileOpen(false)}>
            Leaderboard
          </Link>
          <Link href="/profile" className="user-menu-item" role="menuitem" onClick={() => setMobileOpen(false)}>
            Profile
          </Link>
          <button type="button" className="user-menu-item danger" role="menuitem" onClick={handleLogoutClick}>
            Log out
          </button>
        </div>
      </div>

      {logoutConfirm &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="logout-confirm-overlay"
            role="presentation"
            onClick={closeLogoutConfirm}
          >
            <div
              className="logout-confirm-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-confirm-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="logout-confirm-title" className="logout-confirm-title">
                {logoutDialogCopy.title}
              </h2>
              <p className="logout-confirm-text">{logoutDialogCopy.message}</p>
              <div className="logout-confirm-actions">
                <button type="button" className="logout-confirm-cancel" onClick={closeLogoutConfirm}>
                  Stay on the pitch
                </button>
                <button type="button" className="logout-confirm-ok" onClick={confirmLogout}>
                  Leave the ground
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default function AppHeader({
  onLogoClick,
  logoHref = '/',
  inRoom = false,
  variant,
  homeActions,
  profileMenu,
}: AppHeaderProps) {
  const pathname = usePathname();
  const logoLabel = onLogoClick ? 'Back to matches' : 'FanGround home';
  const [themePref, setThemePref] = useState<ThemePreference | null>(null);
  const [systemTheme, setSystemTheme] = useState<ThemePreference>('light');
  const [hasMounted, setHasMounted] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setHasMounted(true);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = () => setSystemTheme(media.matches ? 'dark' : 'light');
    applySystemTheme();
    media.addEventListener('change', applySystemTheme);

    const saved = localStorage.getItem('fg-theme-preference') as ThemePreference | null;
    const pref: ThemePreference | null = saved === 'light' || saved === 'dark' ? saved : null;
    setThemePref(pref);
    applyThemePreference(pref);

    return () => media.removeEventListener('change', applySystemTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemePref((current) => {
      const activeTheme = current ?? systemTheme;
      const next: ThemePreference = activeTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('fg-theme-preference', next);
      applyThemePreference(next);
      return next;
    });
  }, [systemTheme]);

  const effectiveTheme = themePref ?? systemTheme;

  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const computed = window.getComputedStyle(headerEl);
    // #region agent log
    fetch('http://127.0.0.1:7592/ingest/e89d3128-5670-4ca0-bcd9-a27a5fb2d18a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2ef162'},body:JSON.stringify({sessionId:'2ef162',runId:'initial',hypothesisId:'H1',location:'src/components/AppHeader.tsx:mount',message:'Header computed sticky styles',data:{pathname,position:computed.position,top:computed.top,zIndex:computed.zIndex,classes:headerEl.className},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const ancestorInfo: Array<{ tag: string; className: string; overflow: string; overflowY: string; transform: string; position: string }> = [];
    let node: HTMLElement | null = headerEl.parentElement;
    while (node && ancestorInfo.length < 6) {
      const s = window.getComputedStyle(node);
      ancestorInfo.push({
        tag: node.tagName,
        className: node.className,
        overflow: s.overflow,
        overflowY: s.overflowY,
        transform: s.transform,
        position: s.position,
      });
      node = node.parentElement;
    }
    // #region agent log
    fetch('http://127.0.0.1:7592/ingest/e89d3128-5670-4ca0-bcd9-a27a5fb2d18a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2ef162'},body:JSON.stringify({sessionId:'2ef162',runId:'initial',hypothesisId:'H2',location:'src/components/AppHeader.tsx:mount',message:'Header ancestor layout constraints',data:{pathname,ancestors:ancestorInfo},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    let scrollSamples = 0;
    const onScroll = () => {
      if (scrollSamples >= 4) return;
      scrollSamples += 1;
      const rect = headerEl.getBoundingClientRect();
      // #region agent log
      fetch('http://127.0.0.1:7592/ingest/e89d3128-5670-4ca0-bcd9-a27a5fb2d18a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2ef162'},body:JSON.stringify({sessionId:'2ef162',runId:'initial',hypothesisId:'H3',location:'src/components/AppHeader.tsx:scroll',message:'Header position while scrolling',data:{pathname,sample:scrollSamples,scrollY:window.scrollY,headerTop:rect.top,headerBottom:rect.bottom,viewportH:window.innerHeight},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [pathname]);

  return (
    <header
      ref={headerRef}
      className={`app-header ${inRoom ? 'in-room' : ''}`}
      style={{ position: 'sticky', top: 0, zIndex: 1000 }}
    >
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

        {!inRoom && (
          <div className="app-header-center">
            <Suspense fallback={<div aria-hidden style={{ minHeight: 38 }} />}>
              <SportSelector />
            </Suspense>
          </div>
        )}

        <div className="header-right">
          {hasMounted && (
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={`Theme: ${THEME_LABELS[effectiveTheme]}. Click to switch theme.`}
              title={`Theme: ${THEME_LABELS[effectiveTheme]}`}
            >
              <span className="theme-toggle-icon" aria-hidden>
                {effectiveTheme === 'dark' ? '🌙' : '☀️'}
              </span>
            </button>
          )}

          {variant === 'home' && homeActions && (
            <>
              {homeActions.installPrompt && (
                <button className="install-btn" onClick={homeActions.onInstall} type="button">
                  <span className="install-icon">+</span>
                  Install
                </button>
              )}
              {homeActions.showGoogleSignIn && homeActions.onSignInWithGoogle && (
                <button
                  type="button"
                  className={`google-signin-btn google-signin-btn--header${homeActions.isGoogleSignInLoading ? ' google-signin-btn--loading' : ''}`}
                  onClick={homeActions.onSignInWithGoogle}
                  aria-label="Sign in with Google"
                  aria-busy={homeActions.isGoogleSignInLoading || undefined}
                  disabled={homeActions.isGoogleSignInLoading}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Sign in</span>
                </button>
              )}
              {homeActions.user && (
                <UserAvatarMenu
                  image={homeActions.user.image ?? null}
                  name={homeActions.user.username}
                  onSignOut={homeActions.onSignOut}
                />
              )}
            </>
          )}

          {variant === 'profile' && profileMenu && (
            <UserAvatarMenu
              image={profileMenu.image}
              name={profileMenu.name}
              onSignOut={profileMenu.onSignOut}
            />
          )}
        </div>
      </div>
    </header>
  );
}
