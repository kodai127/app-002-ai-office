import { User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from './supabaseClient';

const productionSiteUrl = 'https://app-002-ai-office.vercel.app';

export type AuthSnapshot = {
  email: string;
  isConfigured: boolean;
  user: User | null;
};

export function getAuthRedirectUrl() {
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '') || productionSiteUrl;

  return `${siteUrl}/settings`;
}

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

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
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

export async function handleAuthCallbackUrl() {
  if (!isSupabaseConfigured || !supabase || typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');

  if (!code) {
    return;
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw error;
  }

  url.searchParams.delete('code');
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}
