import { Linking } from 'react-native';

export type BillingPlan = {
  description: string;
  features: string[];
  key: 'free' | 'pro' | 'business';
  monthlyPrice: string;
  paymentLink?: string;
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
    paymentLink: process.env.EXPO_PUBLIC_STRIPE_PRO_PAYMENT_LINK,
    title: 'Pro',
  },
  {
    description: '小規模チーム・複数案件運用向け',
    features: ['Pro機能すべて', '複数顧客運用', '履歴管理強化', '優先改善対象'],
    key: 'business',
    monthlyPrice: '2,980円',
    paymentLink: process.env.EXPO_PUBLIC_STRIPE_BUSINESS_PAYMENT_LINK,
    title: 'Business',
  },
];

export async function openBillingLink(plan: BillingPlan) {
  if (!plan.paymentLink) {
    throw new Error(`${plan.title}のStripe Payment Linkが未設定です。`);
  }

  await Linking.openURL(plan.paymentLink);
}
