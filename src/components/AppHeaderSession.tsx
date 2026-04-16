'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import AppHeader from '@/components/AppHeader';
import { startGoogleSignInRedirect } from '@/lib/google-signin';
import type { User } from '@/lib/types';

interface AppHeaderSessionProps {
  logoHref?: string;
}

interface ProfileMeResponse {
  profile: {
    image: string | null;
  } | null;
}

const PROFILE_IMAGE_CACHE_KEY = 'fg_cached_profile_image';
const prefetchedImages = new Set<string>();

function getPreferredSessionAvatar(image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  return image.includes('/storage/v1/object/public/') ? image : undefined;
}

function readCachedProfileImage(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const cached = window.sessionStorage.getItem(PROFILE_IMAGE_CACHE_KEY);
  return getPreferredSessionAvatar(cached);
}

function cacheProfileImage(image: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(PROFILE_IMAGE_CACHE_KEY, image);
}

function prefetchProfileImage(image: string) {
  if (typeof window === 'undefined') return;
  if (prefetchedImages.has(image)) return;
  prefetchedImages.add(image);
  const img = new window.Image();
  img.decoding = 'async';
  img.src = image;
}

export default function AppHeaderSession({ logoHref = '/' }: AppHeaderSessionProps) {
  const { data: session, status, update } = useSession();
  const [profileImage, setProfileImage] = useState<string | undefined>(() => {
    return getPreferredSessionAvatar(session?.user?.image) ?? readCachedProfileImage();
  });

  useEffect(() => {
    const fromSession = getPreferredSessionAvatar(session?.user?.image);
    if (fromSession) {
      setProfileImage(fromSession);
      cacheProfileImage(fromSession);
      prefetchProfileImage(fromSession);
      return;
    }

    const cached = readCachedProfileImage();
    setProfileImage(cached);
  }, [session?.user?.image]);

  useEffect(() => {
    if (!session?.user) return;
    const controller = new AbortController();

    const loadProfileImage = async () => {
      try {
        const res = await fetch('/api/profile/me', { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as ProfileMeResponse;
        const preferredImage = getPreferredSessionAvatar(data.profile?.image);
        if (!preferredImage) return;
        prefetchProfileImage(preferredImage);
        cacheProfileImage(preferredImage);
        setProfileImage(preferredImage);
      } catch {
        // Keep fallback avatar if profile image fetch fails.
      }
    };

    void loadProfileImage();
    return () => controller.abort();
  }, [session?.user]);

  const user: User | null = session?.user
    ? {
        userId: session.user.googleSub ?? session.user.email ?? session.user.name ?? 'fan',
        username: session.user.name ?? 'Fan',
        fanTeamId: null,
        email: session.user.email ?? undefined,
        image: profileImage,
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
          void startGoogleSignInRedirect();
        },
      }}
    />
  );
}
