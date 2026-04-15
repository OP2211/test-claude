import { supabase } from '@/lib/supabase';
import type { TeamId } from '@/lib/types';

export interface UserProfile {
  google_sub: string;
  full_name: string | null;
  email: string | null;
  image: string | null;
  username: string;
  phone: string;
  fan_team_id: TeamId;
  dob: string | null;
  city: string | null;
}

export interface PublicProfile {
  google_sub: string;
  username: string;
  email: string | null;
  image: string | null;
  fan_team_id: TeamId;
  city: string | null;
  created_at?: string | null;
}

interface UpsertProfileInput {
  googleSub: string;
  fullName: string | null;
  email: string | null;
  image: string | null;
  username: string;
  phone: string;
  fanTeamId: TeamId;
  dob: string | null;
  city: string | null;
}

export async function getProfileByGoogleSub(googleSub: string): Promise<UserProfile | null> {
  const withFullName = await supabase
    .from('profiles')
    .select('google_sub,full_name,email,image,username,phone,fan_team_id,dob,city')
    .eq('google_sub', googleSub)
    .maybeSingle<UserProfile>();

  if (!withFullName.error) {
    return withFullName.data;
  }

  if (!isMissingColumnError(withFullName.error.message, 'full_name')) {
    throw new Error(withFullName.error.message);
  }

  const legacy = await supabase
    .from('profiles')
    .select('google_sub,email,image,username,phone,fan_team_id,dob,city')
    .eq('google_sub', googleSub)
    .maybeSingle<Omit<UserProfile, 'full_name'>>();

  if (legacy.error) {
    throw new Error(legacy.error.message);
  }

  if (!legacy.data) return null;
  return { ...legacy.data, full_name: null };
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
  const withFullName = await supabase
    .from('profiles')
    .upsert(
      {
        google_sub: input.googleSub,
        full_name: input.fullName,
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
    .select('google_sub,full_name,email,image,username,phone,fan_team_id,dob,city')
    .single<UserProfile>();

  if (!withFullName.error) {
    return withFullName.data;
  }

  if (!isMissingColumnError(withFullName.error.message, 'full_name')) {
    throw new Error(withFullName.error.message);
  }

  const legacy = await supabase
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
    .single<Omit<UserProfile, 'full_name'>>();

  if (legacy.error) {
    throw new Error(legacy.error.message);
  }

  return { ...legacy.data, full_name: input.fullName };
}

function isMissingColumnError(message: string, column: string): boolean {
  return message.toLowerCase().includes(`column "${column}" does not exist`);
}

export async function getSupportersByTeamId(teamId: TeamId): Promise<PublicProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('google_sub,username,email,image,fan_team_id,city,created_at')
    .eq('fan_team_id', teamId)
    .order('username', { ascending: true })
    .returns<PublicProfile[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getPublicProfileByIdOrUsername(idOrUsername: string): Promise<PublicProfile | null> {
  const trimmed = idOrUsername.trim();
  if (!trimmed) return null;

  const byId = await supabase
    .from('profiles')
    .select('google_sub,username,email,image,fan_team_id,city,created_at')
    .eq('google_sub', trimmed)
    .maybeSingle<PublicProfile>();

  if (byId.error) {
    throw new Error(byId.error.message);
  }

  if (byId.data) {
    return byId.data;
  }

  const byUsername = await supabase
    .from('profiles')
    .select('google_sub,username,email,image,fan_team_id,city,created_at')
    .ilike('username', trimmed)
    .limit(1)
    .maybeSingle<PublicProfile>();

  if (byUsername.error) {
    throw new Error(byUsername.error.message);
  }

  return byUsername.data;
}
