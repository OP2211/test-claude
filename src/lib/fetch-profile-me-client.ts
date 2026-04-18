/**
 * Coalesces concurrent /api/profile/me requests (e.g. layout header + page both mount).
 */

export interface ProfileMeClientPayload {
  profile: unknown;
  referralCode?: string | null;
  invitedBy?: unknown;
  invitedMembers?: unknown;
  invitedCount?: number;
  isTeamLeader?: boolean;
  foundingFanTier?: unknown;
  isOnboardingComplete?: boolean;
  error?: string;
}

let inflight: Promise<{ ok: boolean; data: ProfileMeClientPayload }> | null = null;

export async function fetchProfileMeShared(): Promise<{ ok: boolean; data: ProfileMeClientPayload }> {
  if (!inflight) {
    inflight = fetch('/api/profile/me')
      .then(async (res) => {
        const data = (await res.json()) as ProfileMeClientPayload;
        return { ok: res.ok, data };
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
