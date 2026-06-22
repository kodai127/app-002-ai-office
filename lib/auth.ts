import { User } from '@supabase/supabase-js';

import { validateEmail } from './security';
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

function validateRequiredEmail(email: string) {
  const safeEmail = validateEmail(email);

  if (!safeEmail) {
    throw new Error('有効なメールアドレスを入力してください。');
  }

  return safeEmail;
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

  const safeEmail = validateRequiredEmail(email);

  const { error } = await supabase.auth.signInWithOtp({
    email: safeEmail,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }
}

export async function signUpWithEmailPassword(email: string, password: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase環境変数が未設定です。');
  }

  const safeEmail = validateRequiredEmail(email);

  if (password.length < 6) {
    throw new Error('パスワードは6文字以上で入力してください。');
  }

  const { data, error } = await supabase.auth.signUp({
    email: safeEmail,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }

  return data.user;
}

export async function signInWithEmailPassword(email: string, password: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase環境変数が未設定です。');
  }

  const safeEmail = validateRequiredEmail(email);

  if (!password) {
    throw new Error('パスワードを入力してください。');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: safeEmail,
    password,
  });

  if (error) {
    throw error;
  }

  return data.user;
}

export async function sendPasswordResetEmail(email: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase環境変数が未設定です。');
  }

  const safeEmail = validateRequiredEmail(email);

  const { error } = await supabase.auth.resetPasswordForEmail(safeEmail, {
    redirectTo: getAuthRedirectUrl(),
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
    window.sessionStorage.setItem('ai-office-auth-status', 'error');
    window.sessionStorage.setItem('ai-office-auth-message', error.message);
    throw error;
  }

  window.sessionStorage.setItem('ai-office-auth-status', 'success');
  window.sessionStorage.setItem('ai-office-auth-message', 'ログインしました。引き続きAI Officeを利用できます。');
  url.searchParams.delete('code');
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

export function consumeAuthCallbackMessage(): { message: string; type: 'error' | 'success' } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const status = window.sessionStorage.getItem('ai-office-auth-status');
  const message = window.sessionStorage.getItem('ai-office-auth-message');

  window.sessionStorage.removeItem('ai-office-auth-status');
  window.sessionStorage.removeItem('ai-office-auth-message');

  if (!message) {
    return null;
  }

  return {
    message,
    type: status === 'error' ? 'error' : 'success',
  };
}
