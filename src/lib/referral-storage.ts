const REFERRAL_STORAGE_KEY = 'ffc_referral_code';

export function storeReferralCodeFromQuery(rawRef: string | null | undefined): string | null {
  if (typeof window === 'undefined') return null;
  const normalized = rawRef?.trim() ?? '';
  if (!normalized) return null;
  window.localStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
  return normalized;
}

export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(REFERRAL_STORAGE_KEY)?.trim() ?? '';
  return value || null;
}

export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
}
