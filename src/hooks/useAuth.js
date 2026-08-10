import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase, clearAuthStorage } from '../supabaseClient';

export const AuthContext = createContext(null);

/**
 * Remove all sensitive app data from localStorage on sign-out.
 *
 * Cleared:
 *   • chart_backup_{id}   — unsaved chart data (user content)
 *   • last_version_time_* — persistence timestamps
 *   • last_thumb_time_*   — thumbnail timestamps
 *   • gdt_starred_charts  — user's starred list
 *   • __gdt_s_*           — obfuscated auth tokens (via clearAuthStorage)
 *
 * Preserved (not sensitive):
 *   • gdt_theme           — UI theme preference
 *   • gdt_landing_theme   — landing page theme
 *   • gdt_register_view_mode — dashboard view preference
 */
function clearSensitiveCache() {
  // Collect keys first to avoid mutating while iterating
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key?.startsWith('chart_backup_') ||
      key?.startsWith('last_version_time_') ||
      key?.startsWith('last_thumb_time_') ||
      key === 'gdt_starred_charts'
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));

  // Clear obfuscated auth tokens
  clearAuthStorage();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session and handle potential refresh errors cleanly
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    }).catch(() => {
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async ({ email, password, displayName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, full_name: displayName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    return { data, error };
  }, []);

  /* `scope: 'global'` revokes every refresh token for the user, signing out
     all their devices; the default 'local' ends only this browser's session.
     Callers that pass nothing keep the original single-device behaviour. */
  const signOut = useCallback(async (options) => {
    // Clear all sensitive cached data BEFORE signing out so that
    // even if signOut() fails, the local data is already gone.
    clearSensitiveCache();

    const { error } = await supabase.auth.signOut(options);
    return { error };
  }, []);

  const resetPasswordForEmail = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    return { data, error };
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });
    if (!error) setUser(data.user);
    return { data, error };
  }, []);

  const resendVerificationEmail = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    return { data, error };
  }, []);

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;

  const value = {
    user,
    session,
    loading,
    displayName,
    avatarUrl,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPasswordForEmail,
    updatePassword,
    updateProfile,
    resendVerificationEmail,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
