'use client';

import { signIn } from 'next-auth/react';

type StartGoogleSignInOptions = {
  /**
   * If provided, use this as the callback URL. Otherwise, use the current URL.
   * Using the full current URL returns users to the exact same page.
   */
  callbackUrl?: string;
};

export async function startGoogleSignInRedirect(options: StartGoogleSignInOptions = {}) {
  const callbackUrl = options.callbackUrl ?? window.location.href;
  await signIn('google', { callbackUrl });
}

