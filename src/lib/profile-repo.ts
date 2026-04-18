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
  referral_code: string;
  invited_by_google_sub: string | null;
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
  successfulInvites: number;
  isTeamLeader: boolean;
  foundingFanTier: FoundingFanTier;
}

export type FoundingFanTier = 'founding' | 'silver' | 'bronze' | null;

export const FOUNDING_FAN_GOLD_COUNT = 5;
export const FOUNDING_FAN_SILVER_COUNT = 20;
export const FOUNDING_FAN_BRONZE_COUNT = 50;

const FOUNDING_FAN_SILVER_CUTOFF = FOUNDING_FAN_GOLD_COUNT + FOUNDING_FAN_SILVER_COUNT;
const FOUNDING_FAN_BRONZE_CUTOFF = FOUNDING_FAN_SILVER_CUTOFF + FOUNDING_FAN_BRONZE_COUNT;

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
  invitedByGoogleSub?: string | null;
}

export interface ReferralUserSummary {
  google_sub: string;
  full_name: string | null;
  username: string;
  image: string | null;
}

export interface ReferralSnapshot {
  invitedBy: ReferralUserSummary | null;
  invitedMembers: ReferralUserSummary[];
}

export async function getProfileByGoogleSub(googleSub: string): Promise<UserProfile | null> {
  const withFullName = await supabase
    .from('profiles')
    .select('google_sub,full_name,email,image,username,phone,fan_team_id,dob,city,referral_code,invited_by_google_sub,created_at')
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
    .select('google_sub,email,image,username,phone,fan_team_id,dob,city,referral_code,invited_by_google_sub,created_at')
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
  const upsertPayload: Record<string, unknown> = {
    google_sub: input.googleSub,
    full_name: input.fullName,
    email: input.email,
    image: input.image,
    username: input.username,
    phone: input.phone,
    fan_team_id: input.fanTeamId,
    dob: input.dob,
    city: input.city,
  };
  if (input.invitedByGoogleSub !== undefined) {
    upsertPayload.invited_by_google_sub = input.invitedByGoogleSub;
  }

  const withFullName = await supabase
    .from('profiles')
    .upsert(upsertPayload, { onConflict: 'google_sub' })
    .select('google_sub,full_name,email,image,username,phone,fan_team_id,dob,city,referral_code,invited_by_google_sub,created_at')
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
        invited_by_google_sub: input.invitedByGoogleSub,
      },
      { onConflict: 'google_sub' },
    )
    .select('google_sub,email,image,username,phone,fan_team_id,dob,city,referral_code,invited_by_google_sub,created_at')
    .single<Omit<UserProfile, 'full_name'>>();

  if (legacy.error) {
    throw new Error(legacy.error.message);
  }

  return { ...legacy.data, full_name: input.fullName };
}

export async function isTeamLeaderForSupporter(googleSub: string, teamId: TeamId): Promise<boolean> {
  const tier = await getFoundingFanTierForSupporter(googleSub, teamId);
  return tier === 'founding';
}

export async function getFoundingFanTierForSupporter(
  googleSub: string,
  teamId: TeamId,
): Promise<FoundingFanTier> {
  const { data, error } = await supabase
    .from('profiles')
    .select('google_sub,created_at')
    .eq('fan_team_id', teamId)
    .order('created_at', { ascending: true })
    .limit(FOUNDING_FAN_BRONZE_CUTOFF)
    .returns<Array<{ google_sub: string; created_at: string | null }>>();

  if (error) {
    throw new Error(error.message);
  }

  const position = (data ?? []).findIndex((row) => row.google_sub === googleSub);
  if (position === -1) return null;
  if (position < FOUNDING_FAN_GOLD_COUNT) return 'founding';
  if (position < FOUNDING_FAN_SILVER_CUTOFF) return 'silver';
  return 'bronze';
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

export async function getGoogleSubByReferralCode(referralCode: string): Promise<string | null> {
  const normalized = referralCode.trim();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('google_sub')
    .eq('referral_code', normalized)
    .limit(1)
    .maybeSingle<{ google_sub: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data?.google_sub ?? null;
}

export async function getReferralSnapshotByGoogleSub(googleSub: string): Promise<ReferralSnapshot> {
  const [inviterProfile, invitedMembersResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('invited_by_google_sub')
      .eq('google_sub', googleSub)
      .maybeSingle<{ invited_by_google_sub: string | null }>(),
    supabase
      .from('profiles')
      .select('google_sub,full_name,username,image')
      .eq('invited_by_google_sub', googleSub)
      .order('created_at', { ascending: false })
      .returns<ReferralUserSummary[]>(),
  ]);

  if (inviterProfile.error) {
    throw new Error(inviterProfile.error.message);
  }
  if (invitedMembersResult.error) {
    throw new Error(invitedMembersResult.error.message);
  }

  const inviterGoogleSub = inviterProfile.data?.invited_by_google_sub ?? null;
  let invitedBy: ReferralUserSummary | null = null;
  if (inviterGoogleSub) {
    const inviter = await supabase
      .from('profiles')
      .select('google_sub,full_name,username,image')
      .eq('google_sub', inviterGoogleSub)
      .maybeSingle<ReferralUserSummary>();
    if (inviter.error) {
      throw new Error(inviter.error.message);
    }
    invitedBy = inviter.data ?? null;
  }

  return {
    invitedBy,
    invitedMembers: invitedMembersResult.data ?? [],
  };
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

  const [messagesResult, referralsResult] = await Promise.all([
    supabase
      .from('chat_messages')
      .select('user_id,reactions')
      .returns<Array<{ user_id: string; reactions: Record<string, string[]> | null }>>(),
    supabase
      .from('profiles')
      .select('invited_by_google_sub')
      .not('invited_by_google_sub', 'is', null)
      .returns<Array<{ invited_by_google_sub: string | null }>>(),
  ]);
  const { data: messageRows, error } = messagesResult;
  const { data: referralRows, error: referralsError } = referralsResult;

  if (referralsError) {
    throw new Error(referralsError.message);
  }

  const successfulInvitesByUser = new Map<string, number>();
  for (const row of referralRows ?? []) {
    const inviterGoogleSub = row.invited_by_google_sub;
    if (!inviterGoogleSub) continue;
    successfulInvitesByUser.set(inviterGoogleSub, (successfulInvitesByUser.get(inviterGoogleSub) ?? 0) + 1);
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

  const earliestGoldByTeam = new Map<TeamId, Set<string>>();
  const earliestSilverByTeam = new Map<TeamId, Set<string>>();
  const earliestBronzeByTeam = new Map<TeamId, Set<string>>();
  const profilesByTeam = new Map<TeamId, PublicProfile[]>();
  for (const profile of profiles) {
    const existing = profilesByTeam.get(profile.fan_team_id) ?? [];
    existing.push(profile);
    profilesByTeam.set(profile.fan_team_id, existing);
  }

  for (const [teamId, teamProfiles] of profilesByTeam.entries()) {
    const sorted = [...teamProfiles]
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });
    const goldTier = sorted.slice(0, FOUNDING_FAN_GOLD_COUNT).map((profile) => profile.google_sub);
    const silverTier = sorted.slice(0, FOUNDING_FAN_SILVER_CUTOFF).map((profile) => profile.google_sub);
    const bronzeTier = sorted.slice(0, FOUNDING_FAN_BRONZE_CUTOFF).map((profile) => profile.google_sub);
    earliestGoldByTeam.set(teamId, new Set(goldTier));
    earliestSilverByTeam.set(teamId, new Set(silverTier));
    earliestBronzeByTeam.set(teamId, new Set(bronzeTier));
  }

  return profiles.map((profile) => {
    const stats = statsByUser.get(profile.google_sub);
    const leadersForTeam = earliestGoldByTeam.get(profile.fan_team_id);
    const topSilverForTeam = earliestSilverByTeam.get(profile.fan_team_id);
    const topBronzeForTeam = earliestBronzeByTeam.get(profile.fan_team_id);
    const isTeamLeader = leadersForTeam ? leadersForTeam.has(profile.google_sub) : false;
    const isTopSilver = topSilverForTeam ? topSilverForTeam.has(profile.google_sub) : false;
    const isTopBronze = topBronzeForTeam ? topBronzeForTeam.has(profile.google_sub) : false;
    const foundingFanTier: FoundingFanTier = isTeamLeader
      ? 'founding'
      : isTopSilver
        ? 'silver'
        : isTopBronze
          ? 'bronze'
        : null;

    return {
      ...profile,
      messagesSent: stats?.messagesSent ?? 0,
      reactionsReceived: stats?.reactionsReceived ?? 0,
      successfulInvites: successfulInvitesByUser.get(profile.google_sub) ?? 0,
      isTeamLeader,
      foundingFanTier,
    };
  });
}
