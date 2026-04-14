'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { TEAM_OPTIONS } from '@/lib/teams';
import { isValidE164Phone, validateUsername } from '@/lib/profile/validation';
import type { ProfileInput } from '@/lib/profile/types';
import { useAuth } from '@/app/AuthContext';
import './OnboardingModal.css';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  forceProfileSetup?: boolean;
  onCompleteProfile?: (profile: ProfileInput) => Promise<void> | void;
}

const initialProfile: ProfileInput = {
  name: '',
  username: '',
  email: '',
  mobileNumber: '',
  team: TEAM_OPTIONS[0],
  avatarUrl: '',
};

export default function AuthModal({
  onClose,
  onSuccess,
  forceProfileSetup = false,
  onCompleteProfile,
}: AuthModalProps) {
  const { session } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [profile, setProfile] = useState<ProfileInput>(initialProfile);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const saveProfile = async (userId: string, input: ProfileInput) => {
    const supabase = getSupabaseBrowserClient();
    const usernameValidation = validateUsername(input.username);
    if (!usernameValidation.ok) throw new Error(usernameValidation.message);
    if (!isValidE164Phone(input.mobileNumber)) throw new Error('Use mobile format like +919876543210');

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      name: input.name.trim(),
      username: usernameValidation.username,
      email: input.email.trim().toLowerCase(),
      mobile_number: input.mobileNumber.trim(),
      team: input.team,
      avatar_url: input.avatarUrl?.trim() || null,
    });
    if (profileError) throw new Error(profileError.message);
  };

  const onSignIn = async () => {
    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });
    if (signInError) throw new Error(signInError.message);
  };

  const onSignUp = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: profile.email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/auth-popup-done`,
        data: { name: profile.name, avatar_url: profile.avatarUrl || null },
      },
    });
    if (signUpError) throw new Error(signUpError.message);
    const userId = data.user?.id;
    if (!userId) throw new Error('Could not create user account');
    await saveProfile(userId, profile);
  };

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      if (forceProfileSetup) {
        const usernameValidation = validateUsername(profile.username);
        if (!usernameValidation.ok) throw new Error(usernameValidation.message);
        if (!isValidE164Phone(profile.mobileNumber)) throw new Error('Use mobile format like +919876543210');

        const normalizedProfile: ProfileInput = {
          ...profile,
          username: usernameValidation.username,
          email: session?.user?.email ?? profile.email,
        };

        if (session?.user) {
          await saveProfile(session.user.id, normalizedProfile);
        } else if (onCompleteProfile) {
          await onCompleteProfile(normalizedProfile);
        } else {
          throw new Error('No user session found for profile completion.');
        }
      } else if (mode === 'signin') {
        await onSignIn();
      } else {
        await onSignUp();
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ob-overlay" onClick={onClose}>
      <div className="ob-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ob-step">
          <h2 className="ob-title">{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
          {!forceProfileSetup && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ob-btn" onClick={() => setMode('signin')} type="button">Sign in</button>
              <button className="ob-btn" onClick={() => setMode('signup')} type="button">Sign up</button>
            </div>
          )}
          {(mode === 'signup' || forceProfileSetup) && (
            <>
              <input className="ob-dev-input" placeholder="Name" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              <input className="ob-dev-input" placeholder="Username" value={profile.username} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} />
              <input className="ob-dev-input" placeholder="Mobile (+919876543210)" value={profile.mobileNumber} onChange={(e) => setProfile((p) => ({ ...p, mobileNumber: e.target.value }))} />
              <select className="ob-dev-input" value={profile.team} onChange={(e) => setProfile((p) => ({ ...p, team: e.target.value }))}>
                {TEAM_OPTIONS.map((team) => (
                  <option value={team} key={team}>{team}</option>
                ))}
              </select>
              <input className="ob-dev-input" placeholder="Profile pic URL (optional)" value={profile.avatarUrl} onChange={(e) => setProfile((p) => ({ ...p, avatarUrl: e.target.value }))} />
            </>
          )}
          {!forceProfileSetup && (
            <>
              <input className="ob-dev-input" type="email" placeholder="Email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
              <input className="ob-dev-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </>
          )}
          {error ? <p className="ob-error">{error}</p> : null}
          <button className="ob-btn primary" onClick={submit} disabled={loading} type="button">
            {loading ? 'Please wait...' : forceProfileSetup ? 'Save profile' : mode === 'signin' ? 'Sign in' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
