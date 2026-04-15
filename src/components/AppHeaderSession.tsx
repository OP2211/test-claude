'use client';

import { signOut, useSession } from 'next-auth/react';
import AppHeader from '@/components/AppHeader';
import { openGoogleSignInPopup } from '@/lib/google-signin-popup';
import type { User } from '@/lib/types';

interface AppHeaderSessionProps {
  logoHref?: string;
}

export default function AppHeaderSession({ logoHref = '/' }: AppHeaderSessionProps) {
  const { data: session, status, update } = useSession();

  const user: User | null = session?.user
    ? {
        userId: session.user.googleSub ?? session.user.email ?? session.user.name ?? 'fan',
        username: session.user.name ?? 'Fan',
        fanTeamId: null,
        email: session.user.email ?? undefined,
        image: session.user.image ?? undefined,
        googleSub: session.user.googleSub ?? undefined,
      }
    : null;

  return (
    <AppHeader
      variant="home"
      logoHref={logoHref}
      homeActions={{
        installPrompt: false,
        onInstall: () => {},
        user,
        onSignOut: () => {
          void signOut({ callbackUrl: '/' });
        },
        showGoogleSignIn: status === 'unauthenticated',
        onSignInWithGoogle: () => {
          void openGoogleSignInPopup(() => update());
        },
      }}
    />
  );
}
