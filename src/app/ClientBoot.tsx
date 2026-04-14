'use client';

import { useEffect } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';

export default function ClientBoot() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fg-theme-preference') as ThemePreference | null;
      const pref: ThemePreference = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
      if (pref === 'system') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', pref);
      }
    } catch {
      // Ignore localStorage/document access failures.
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener(
        'load',
        () => {
          navigator.serviceWorker.register('/sw.js').catch(() => {});
        },
        { once: true }
      );
    }
  }, []);

  return null;
}
