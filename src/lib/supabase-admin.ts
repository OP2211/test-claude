import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin(requireServiceRole = false) {
  // Read env vars at call time so local `.env` edits in dev are picked up
  // without requiring this module instance to be reloaded.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    return null;
  }

  // For sensitive server APIs, require service-role explicitly.
  // For local/dev helpers, allow publishable/anon fallback.
  const key = requireServiceRole
    ? supabaseServiceRoleKey
    : (supabaseServiceRoleKey || supabasePublishableKey || supabaseAnonKey);
  if (!key) return null;

  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  });
}
