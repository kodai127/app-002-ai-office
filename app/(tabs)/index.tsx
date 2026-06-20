import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Link } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { SeoHead } from '@/components/SeoHead';
import { billingPlans } from '@/lib/billing';
import {
  formatCurrency,
  isThisMonth,
  mockCustomers,
  mockEstimateRecords,
  mockInvoiceRecords,
} from '@/lib/officeData';

const monthlyEstimateCount = mockEstimateRecords.filter((estimate) =>
  isThisMonth(estimate.issuedAt)
).length;
const monthlyInvoiceAmount = mockInvoiceRecords
  .filter((invoice) => isThisMonth(invoice.issuedAt))
  .reduce((total, invoice) => total + invoice.amount, 0);

const sampleEstimateParams = {
  customerName: '株式会社サンプル',
  hourlyRate: '8000',
  hours: '24',
  projectName: 'コーポレートサイト制作',
  workDescription: '要件整理、デザイン調整、Webサイト実装、公開作業',
};

const sampleInvoiceParams = {
  ...sampleEstimateParams,
  dueDate: '2026-07-31',
  invoiceNumber: 'INV-20260620-001',
  issueDate: '2026-06-20',
};

const appFeatures = [
  '見積金額を工数と単価から自動計算',
  '見積書と請求書をブラウザで作成',
  'PDF出力と履歴保存に対応',
  '顧客管理と請求状況をまとめて確認',
];

const usageSteps = [
  '顧客名、案件名、作業内容を入力します。',
  '工数と単価を入力して見積金額を確認します。',
  '見積書PDFを出力し、必要に応じて請求書へ変換します。',
  '請求書番号、発行日、支払期限を入れて請求書PDFを作成します。',
];

export default function HomeScreen() {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const contactUrl = useMemo(() => {
    const body = [
      `お名前: ${contactName}`,
      `メール: ${contactEmail}`,
      '',
      contactMessage,
    ].join('\n');

    return `https://github.com/kodai127/app-002-ai-office/issues/new?title=${encodeURIComponent(
      'AI Officeへのお問い合わせ'
    )}&body=${encodeURIComponent(body)}`;
  }, [contactEmail, contactMessage, contactName]);

  const handleContactSubmit = () => {
    Linking.openURL(contactUrl);
  };

  const handleOpenPaymentLink = (paymentLink: string) => {
    Linking.openURL(paymentLink);
  };

  return (
    <>
      <SeoHead
        title="フリーランス向け見積書・請求書作成アプリ"
        description="AI Officeは、フリーランスや個人事業主がブラウザで見積書・請求書を作成し、PDF出力できる業務効率化Webアプリです。サンプル見積書とサンプル請求書をすぐ試せます。"
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={styles.content} lightColor="transparent" darkColor="transparent">
          <View style={styles.hero} lightColor="transparent" darkColor="transparent">
            <Text style={styles.eyebrow}>AI Office</Text>
            <Text style={styles.title}>フリーランス向け見積書・請求書作成アプリ</Text>
            <Text style={styles.description}>
              見積作成、請求書作成、PDF出力、顧客管理をブラウザでまとめて扱える小規模事業者向けの業務ツールです。
            </Text>
            <View style={styles.ctaRow} lightColor="transparent" darkColor="transparent">
              <Link
                href={{
                  pathname: '/estimate',
                  params: sampleEstimateParams,
                }}
                style={styles.primaryLink}>
                サンプル見積書を作成
              </Link>
              <Link
                href={{
                  pathname: '/invoice',
                  params: sampleInvoiceParams,
                }}
                style={styles.secondaryLink}>
                サンプル請求書を作成
              </Link>
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>AI Officeでできること</Text>
              <Text style={styles.panelMeta}>
                フリーランス、個人事業主、小規模制作会社の見積書・請求書作成を短時間で進めます。
              </Text>
            </View>
            {appFeatures.map((feature) => (
              <View key={feature} style={styles.bulletRow} lightColor="transparent" darkColor="transparent">
                <Text style={styles.bulletMark}>✓</Text>
                <Text style={styles.bulletText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>利用方法</Text>
              <Text style={styles.panelMeta}>サンプルデータ入りのボタンから、入力済みの作成画面をすぐ確認できます。</Text>
            </View>
            {usageSteps.map((step, index) => (
              <View key={step} style={styles.stepRow} lightColor="transparent" darkColor="transparent">
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.kpiGrid} lightColor="transparent" darkColor="transparent">
            <KpiCard label="今月見積件数" value={`${monthlyEstimateCount}件`} trend="サンプルデータ" />
            <KpiCard label="今月請求額" value={formatCurrency(monthlyInvoiceAmount)} trend="入金予定を含む" />
            <KpiCard label="顧客数" value={`${mockCustomers.length}社`} trend="管理画面で確認可能" />
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>サンプル履歴</Text>
              <Text style={styles.panelMeta}>作成後の見積・請求履歴の見え方を確認できます。</Text>
            </View>
            {mockEstimateRecords.slice(0, 2).map((estimate) => (
              <View key={estimate.id} style={styles.listRow} lightColor="transparent" darkColor="transparent">
                <View style={styles.rowBody} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.rowTitle}>{estimate.projectName}</Text>
                  <Text style={styles.rowSub}>{estimate.customerName}</Text>
                </View>
                <View style={styles.rowSide} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.rowAmount}>{formatCurrency(estimate.amount)}</Text>
                  <Text style={styles.status}>{statusLabel(estimate.status)}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>月額プラン</Text>
              <Text style={styles.panelMeta}>月300万円を目標に、Freeから有料プランへアップグレードできる構成です。</Text>
            </View>
            {billingPlans.map((plan) => (
              <View key={plan.key} style={styles.planRow} lightColor="transparent" darkColor="transparent">
                <View style={styles.rowBody} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.rowTitle}>
                    {plan.title} / 月額{plan.monthlyPrice}
                  </Text>
                  <Text style={styles.rowSub}>{plan.description}</Text>
                </View>
                <Text style={styles.status}>{plan.key === 'free' ? '体験' : 'Stripe対応'}</Text>
                {plan.paymentLink ? (
                  <Pressable style={styles.planButton} onPress={() => handleOpenPaymentLink(plan.paymentLink!)}>
                    <Text style={styles.planButtonText} lightColor="#ffffff" darkColor="#ffffff">
                      {plan.key === 'pro' ? '980円で始める' : '2,980円で始める'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Link href="/settings" style={styles.primaryLink}>
              ログイン・料金管理へ
            </Link>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>お問い合わせ</Text>
              <Text style={styles.panelMeta}>
                要望、導入相談、不具合報告はこちらから送信できます。GitHub Issue作成画面が開きます。
              </Text>
            </View>
            <Field label="お名前" value={contactName} onChangeText={setContactName} placeholder="山田 太郎" />
            <Field
              label="メールアドレス"
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
            />
            <Field
              label="お問い合わせ内容"
              value={contactMessage}
              onChangeText={setContactMessage}
              placeholder="見積書テンプレートについて相談したい"
              multiline
            />
            <Pressable style={styles.contactButton} onPress={handleContactSubmit}>
              <Text style={styles.contactButtonText} lightColor="#ffffff" darkColor="#ffffff">
                お問い合わせを送信
              </Text>
            </Pressable>
          </View>

          <View style={styles.linkPanel}>
            <Text style={styles.panelTitle}>関連リンク</Text>
            <View style={styles.externalLinks} lightColor="transparent" darkColor="transparent">
              <Link href="https://x.com/kodai127" target="_blank" style={styles.externalLink}>
                Xアカウント
              </Link>
              <Link href="https://github.com/kodai127/app-002-ai-office" target="_blank" style={styles.externalLink}>
                GitHub
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function KpiCard({ label, trend, value }: { label: string; trend: string; value: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiTrend}>{trend}</Text>
    </View>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    accepted: '受注',
    draft: '下書き',
    sent: '送付済み',
  };

  return labels[status] ?? status;
}

function invoiceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: '下書き',
    overdue: '期限超過',
    paid: '入金済み',
    sent: '送付済み',
  };

  return labels[status] ?? status;
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  multiline?: boolean;
};

function Field({ keyboardType = 'default', label, multiline, onChangeText, placeholder, value }: FieldProps) {
  return (
    <View style={styles.field} lightColor="transparent" darkColor="transparent">
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.textArea : undefined]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  content: {
    width: '100%',
    maxWidth: 600,
    gap: 14,
  },
  hero: {
    gap: 12,
    paddingBottom: 6,
  },
  eyebrow: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
  },
  description: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
  },
  ctaRow: {
    gap: 10,
  },
  primaryLink: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: 'center',
  },
  secondaryLink: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: 'center',
  },
  kpiGrid: {
    gap: 10,
  },
  kpiCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  kpiLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  kpiValue: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  kpiTrend: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  panel: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#ffffff',
    gap: 10,
  },
  panelHeader: {
    gap: 2,
    marginBottom: 2,
  },
  panelTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  panelMeta: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bulletMark: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '900',
  },
  bulletText: {
    color: '#111827',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 24,
    textAlign: 'center',
  },
  stepText: {
    color: '#111827',
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  listRow: {
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    gap: 8,
    paddingTop: 12,
  },
  planRow: {
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    gap: 8,
    paddingTop: 12,
  },
  planButton: {
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  planButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  rowBody: {
    gap: 2,
  },
  rowTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  rowSub: {
    color: '#64748b',
    fontSize: 13,
  },
  rowSide: {
    alignItems: 'flex-start',
    gap: 3,
  },
  rowAmount: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  status: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
  },
  field: {
    gap: 6,
  },
  label: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#d8dee8',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: '#ffffff',
    color: '#111827',
    fontSize: 16,
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  contactButton: {
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  linkPanel: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  externalLinks: {
    gap: 10,
  },
  externalLink: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '800',
  },
});
