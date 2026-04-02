'use client';

import { useEffect } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';

function SessionPopupBridge() {
  const { update } = useSession();
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'nextauth:signin-complete') {
        void update();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [update]);
  return null;
}

export default function AuthContext({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionPopupBridge />
      {children}
    </SessionProvider>
  );
}
