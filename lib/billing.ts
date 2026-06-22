import { Linking } from 'react-native';

import { isSupabaseConfigured, supabase } from './supabaseClient';

export type BillingPlan = {
  description: string;
  features: string[];
  key: 'free' | 'pro' | 'business';
  monthlyPrice: string;
  paymentLink?: string;
  title: string;
};

export const proPaymentLink = 'https://buy.stripe.com/6oUfZi9Ce7uwdGH9e74gg00';
export const businessPaymentLink = 'https://buy.stripe.com/aFaaEY6q22acfOP2PJ4gg01';

export const billingPlans: BillingPlan[] = [
  {
    description: '永久無料。小さく始めたい個人向け',
    features: ['案件3件', '顧客3件', '見積3件', '請求3件'],
    key: 'free',
    monthlyPrice: '0円',
    title: 'Free',
  },
  {
    description: '個人事業主・フリーランス向け',
    features: ['すべて無制限', '未入金管理', 'CSV出力'],
    key: 'pro',
    monthlyPrice: '980円',
    paymentLink: proPaymentLink,
    title: 'Pro',
  },
  {
    description: '将来のチーム機能に備える事業者向け',
    features: ['Pro機能すべて', 'チーム機能準備', '複数人運用の準備'],
    key: 'business',
    monthlyPrice: '2,980円',
    paymentLink: businessPaymentLink,
    title: 'Business',
  },
];

export async function openBillingLink(plan: BillingPlan) {
  if (plan.key === 'free') {
    return;
  }

  if (plan.paymentLink) {
    await Linking.openURL(plan.paymentLink);
    return;
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Stripe CheckoutにはSupabaseログイン設定が必要です。');
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error('Stripe Checkoutにはログインが必要です。');
  }

  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plan: plan.key }),
  });
  const payload = (await response.json()) as { error?: string; url?: string };

  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? 'Stripe Checkoutを開始できませんでした。');
  }

  await Linking.openURL(payload.url);
}

export async function openCustomerPortal() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('サブスク管理にはSupabaseログイン設定が必要です。');
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error('サブスク管理にはログインが必要です。');
  }

  const response = await fetch('/api/create-customer-portal-session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      'Content-Type': 'application/json',
    },
  });
  const payload = (await response.json()) as { error?: string; url?: string };

  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? 'Customer Portalを開始できませんでした。');
  }

  await Linking.openURL(payload.url);
}
