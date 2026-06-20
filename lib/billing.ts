import { Linking } from 'react-native';

import { isSupabaseConfigured, supabase } from './supabaseClient';

export type BillingPlan = {
  description: string;
  features: string[];
  key: 'free' | 'pro' | 'business';
  monthlyPrice: string;
  title: string;
};

export const billingPlans: BillingPlan[] = [
  {
    description: '公開前の体験と軽い利用向け',
    features: ['見積書作成', '請求書作成', 'PDF出力', 'ローカル保存'],
    key: 'free',
    monthlyPrice: '0円',
    title: 'Free',
  },
  {
    description: '個人事業主・フリーランス向け',
    features: ['顧客管理', '請求書履歴', 'PDF出力', 'Supabase同期'],
    key: 'pro',
    monthlyPrice: '980円',
    title: 'Pro',
  },
  {
    description: '小規模チーム・複数案件運用向け',
    features: ['Pro機能すべて', '複数顧客運用', '履歴管理強化', '優先改善対象'],
    key: 'business',
    monthlyPrice: '2,980円',
    title: 'Business',
  },
];

export async function openBillingLink(plan: BillingPlan) {
  if (plan.key === 'free') {
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
