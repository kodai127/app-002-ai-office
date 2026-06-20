import { User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from './supabaseClient';

export type AuthSnapshot = {
  email: string;
  isConfigured: boolean;
  user: User | null;
};

export async function getCurrentUser() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
}

export async function sendLoginLink(email: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase環境変数が未設定です。');
  }

  const redirectTo =
    process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://app-002-ai-office.vercel.app';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOut() {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export function subscribeToAuthState(onChange: (user: User | null) => void) {
  if (!isSupabaseConfigured || !supabase) {
    onChange(null);
    return () => {};
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}
