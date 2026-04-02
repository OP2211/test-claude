import { getCsrfToken } from 'next-auth/react';

const POPUP_DONE_PATH = '/auth/auth-popup-done';

/**
 * Opens Google OAuth in a centered popup. After success, the popup lands on
 * `/auth/auth-popup-done`, which notifies the opener and closes.
 * Call `onClosed` when the popup is closed to refetch the session (e.g. `update()` from useSession).
 */
export async function openGoogleSignInPopup(onClosed?: () => void): Promise<Window | null> {
  const callbackUrl = `${window.location.origin}${POPUP_DONE_PATH}`;
  const csrfToken = await getCsrfToken();
  const res = await fetch(`${window.location.origin}/api/auth/signin/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      csrfToken: csrfToken ?? '',
      callbackUrl,
      json: 'true',
    }),
  });
  const data = (await res.json()) as { url?: string };
  if (!data.url) return null;

  const w = 500;
  const h = 620;
  const left = window.screenX + (window.outerWidth - w) / 2;
  const top = window.screenY + (window.outerHeight - h) / 2;
  const popup = window.open(
    data.url,
    'google-oauth',
    `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
  if (!popup) return null;

  const timer = window.setInterval(() => {
    if (popup.closed) {
      window.clearInterval(timer);
      onClosed?.();
    }
  }, 400);
  return popup;
}
