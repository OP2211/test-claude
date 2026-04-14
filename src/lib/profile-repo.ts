import { supabase } from '@/lib/supabase';
import type { TeamId } from '@/lib/types';

export interface UserProfile {
  google_sub: string;
  email: string | null;
  image: string | null;
  username: string;
  phone: string;
  fan_team_id: TeamId;
  dob: string | null;
  city: string | null;
}

interface UpsertProfileInput {
  googleSub: string;
  email: string | null;
  image: string | null;
  username: string;
  phone: string;
  fanTeamId: TeamId;
  dob: string | null;
  city: string | null;
}

export async function getProfileByGoogleSub(googleSub: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('google_sub,email,image,username,phone,fan_team_id,dob,city')
    .eq('google_sub', googleSub)
    .maybeSingle<UserProfile>();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function isUsernameAvailable(username: string, googleSub?: string): Promise<boolean> {
  let query = supabase
    .from('profiles')
    .select('google_sub')
    .ilike('username', username)
    .limit(1);

  if (googleSub) {
    query = query.neq('google_sub', googleSub);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).length === 0;
}

export async function upsertProfile(input: UpsertProfileInput): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        google_sub: input.googleSub,
        email: input.email,
        image: input.image,
        username: input.username,
        phone: input.phone,
        fan_team_id: input.fanTeamId,
        dob: input.dob,
        city: input.city,
      },
      { onConflict: 'google_sub' },
    )
    .select('google_sub,email,image,username,phone,fan_team_id,dob,city')
    .single<UserProfile>();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
