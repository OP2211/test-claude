'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { SessionProvider } from 'next-auth/react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContextValue = createContext<AuthContextValue | null>(null);

export default function AuthContext({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    void supabase.auth.getSession().then((sessionResponse) => {
      if (mounted) {
        setSession(sessionResponse.data.session ?? null);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      refreshSession: async () => {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        setSession(data.session ?? null);
      },
      signOut: async () => {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
      },
    }),
    [loading, session]
  );

  return (
    <SessionProvider>
      <AuthContextValue.Provider value={value}>
        {children}
      </AuthContextValue.Provider>
    </SessionProvider>
  );
}

export function useAuth() {
  const value = useContext(AuthContextValue);
  if (!value) {
    throw new Error('useAuth must be used within AuthContext');
  }
  return value;
}
