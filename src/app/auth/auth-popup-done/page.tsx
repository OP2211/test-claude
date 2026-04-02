'use client';

import { useEffect } from 'react';

/** Loaded in the OAuth popup after sign-in so the opener can refresh session and the window can close. */
export default function AuthPopupDone() {
  useEffect(() => {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'nextauth:signin-complete' }, window.location.origin);
      }
    } finally {
      window.close();
    }
  }, []);

  return (
    <div style={{ padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p>Done — you can close this window.</p>
    </div>
  );
}
