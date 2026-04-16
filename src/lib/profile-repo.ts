import { supabase } from '@/lib/supabase';
import { persistProfileImageLocally } from '@/lib/profile-image';
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
  created_at?: string | null;
}

export interface PublicProfile {
  google_sub: string;
  full_name: string | null;
  username: string;
  email: string | null;
  image: string | null;
  fan_team_id: TeamId;
  city: string | null;
  created_at?: string | null;
}

export interface LeaderboardProfile extends PublicProfile {
  messagesSent: number;
  reactionsReceived: number;
  isTeamLeader: boolean;
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
    .select('google_sub,full_name,email,image,username,phone,fan_team_id,dob,city,created_at')
    .eq('google_sub', googleSub)
    .maybeSingle<UserProfile>();

  if (!withFullName.error) {
    return maybePersistLocalAvatar(withFullName.data);
  }

  if (!isMissingColumnError(withFullName.error.message, 'full_name')) {
    throw new Error(withFullName.error.message);
  }

  const legacy = await supabase
    .from('profiles')
    .select('google_sub,email,image,username,phone,fan_team_id,dob,city,created_at')
    .eq('google_sub', googleSub)
    .maybeSingle<Omit<UserProfile, 'full_name'>>();

  if (legacy.error) {
    throw new Error(legacy.error.message);
  }

  if (!legacy.data) return null;
  const hydrated = await maybePersistLocalAvatar({ ...legacy.data, full_name: null });
  return hydrated;
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
    .select('google_sub,full_name,email,image,username,phone,fan_team_id,dob,city,created_at')
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
    .select('google_sub,email,image,username,phone,fan_team_id,dob,city,created_at')
    .single<Omit<UserProfile, 'full_name'>>();

  if (legacy.error) {
    throw new Error(legacy.error.message);
  }

  return { ...legacy.data, full_name: input.fullName };
}

export async function isTeamLeaderForSupporter(googleSub: string, teamId: TeamId): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('google_sub,created_at')
    .eq('fan_team_id', teamId)
    .order('created_at', { ascending: true })
    .limit(5)
    .returns<Array<{ google_sub: string; created_at: string | null }>>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).some((row) => row.google_sub === googleSub);
}

function isMissingColumnError(message: string, column: string): boolean {
  return message.toLowerCase().includes(`column "${column}" does not exist`);
}

async function maybePersistLocalAvatar(profile: UserProfile | null): Promise<UserProfile | null> {
  if (!profile?.image) {
    return profile;
  }

  if (isLegacyMissingLocalAvatar(profile.image)) {
    await supabase.from('profiles').update({ image: null }).eq('google_sub', profile.google_sub);
    return { ...profile, image: null };
  }

  if (profile.image.startsWith('/')) {
    return profile;
  }

  try {
    const localImage = await persistProfileImageLocally(profile.google_sub, profile.image);
    if (!localImage || localImage === profile.image) {
      return profile;
    }

    await supabase.from('profiles').update({ image: localImage }).eq('google_sub', profile.google_sub);
    return { ...profile, image: localImage };
  } catch {
    return profile;
  }
}

function isLegacyMissingLocalAvatar(image: string): boolean {
  return image.startsWith('/profile-images/');
}

export async function getSupportersByTeamId(teamId: TeamId): Promise<PublicProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('google_sub,full_name,username,email,image,fan_team_id,city,created_at')
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
    .select('google_sub,full_name,username,email,image,fan_team_id,city,created_at')
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
    .select('google_sub,full_name,username,email,image,fan_team_id,city,created_at')
    .ilike('username', trimmed)
    .limit(1)
    .maybeSingle<PublicProfile>();

  if (byUsername.error) {
    throw new Error(byUsername.error.message);
  }

  return byUsername.data;
}

export async function getAllPublicProfiles(): Promise<PublicProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('google_sub,full_name,username,email,image,fan_team_id,city,created_at')
    .order('created_at', { ascending: true })
    .returns<PublicProfile[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getLeaderboardProfiles(): Promise<LeaderboardProfile[]> {
  const profiles = await getAllPublicProfiles();
  if (profiles.length === 0) return [];

  const { data: messageRows, error } = await supabase
    .from('chat_messages')
    .select('user_id,reactions')
    .returns<Array<{ user_id: string; reactions: Record<string, string[]> | null }>>();

  if (error) {
    throw new Error(error.message);
  }

  const statsByUser = new Map<string, { messagesSent: number; reactionsReceived: number }>();
  for (const row of messageRows ?? []) {
    const current = statsByUser.get(row.user_id) ?? { messagesSent: 0, reactionsReceived: 0 };
    current.messagesSent += 1;

    const reactions = row.reactions ?? {};
    for (const users of Object.values(reactions)) {
      current.reactionsReceived += users.length;
    }

    statsByUser.set(row.user_id, current);
  }

  const earliestFiveByTeam = new Map<TeamId, Set<string>>();
  const profilesByTeam = new Map<TeamId, PublicProfile[]>();
  for (const profile of profiles) {
    const existing = profilesByTeam.get(profile.fan_team_id) ?? [];
    existing.push(profile);
    profilesByTeam.set(profile.fan_team_id, existing);
  }

  for (const [teamId, teamProfiles] of profilesByTeam.entries()) {
    const topFive = [...teamProfiles]
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      })
      .slice(0, 5)
      .map((profile) => profile.google_sub);
    earliestFiveByTeam.set(teamId, new Set(topFive));
  }

  return profiles.map((profile) => {
    const stats = statsByUser.get(profile.google_sub);
    const leadersForTeam = earliestFiveByTeam.get(profile.fan_team_id);
    const isTeamLeader = leadersForTeam ? leadersForTeam.has(profile.google_sub) : false;

    return {
      ...profile,
      messagesSent: stats?.messagesSent ?? 0,
      reactionsReceived: stats?.reactionsReceived ?? 0,
      isTeamLeader,
    };
  });
}
