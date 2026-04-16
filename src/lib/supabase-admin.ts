import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  // Read env vars at call time so local `.env` edits in dev are picked up
  // without requiring this module instance to be reloaded.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    return null;
  }

  // Prefer service-role key for server APIs. Fallback to publishable key so
  // chat persistence can still function in local/dev environments where
  // service-role key is not loaded yet.
  const key = supabaseServiceRoleKey || supabasePublishableKey || supabaseAnonKey;
  if (!key) return null;

  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
