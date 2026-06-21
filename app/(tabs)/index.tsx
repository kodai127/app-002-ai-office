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

const useCases = [
  {
    title: 'Web制作フリーランス',
    description: '初回相談後、その場で概算見積を作成。受注後は同じ内容から請求書へ進められます。',
    result: '見積から請求までの転記を削減',
  },
  {
    title: '業務委託エンジニア',
    description: '月末の稼働時間と単価を入力して、請求書PDFと履歴をまとめて管理できます。',
    result: '毎月の請求作業を短縮',
  },
  {
    title: '個人事業主の継続案件',
    description: '顧客情報と過去履歴を残し、同じ取引先への見積・請求をすばやく再作成できます。',
    result: '継続案件の事務作業を標準化',
  },
];

const faqItems = [
  {
    question: '無料で使えますか？',
    answer: '月3回まで無料です',
  },
  {
    question: 'インボイス対応ですか？',
    answer: '対応しています',
  },
  {
    question: 'PDF出力できますか？',
    answer: 'できます',
  },
  {
    question: '解約できますか？',
    answer: 'いつでも可能です',
  },
];

const comparisonRows = [
  { feature: '月間作成件数', free: '3件まで', pro: '無制限', business: '無制限' },
  { feature: '見積書・請求書作成', free: '対応', pro: '対応', business: '対応' },
  { feature: 'PDF出力', free: '対応', pro: '対応', business: '対応' },
  { feature: '顧客管理', free: '体験のみ', pro: '対応', business: '対応' },
  { feature: '履歴保存', free: '制限あり', pro: '無制限', business: '無制限' },
  { feature: 'おすすめ対象', free: '試用', pro: '個人事業主', business: '小規模チーム' },
];

export default function HomeScreen() {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const proPlan = billingPlans.find((plan) => plan.key === 'pro');
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
        title="AI請求書・見積書作成"
        description="AI Officeは、個人事業主・フリーランス向けのAI請求書・見積書作成SaaSです。インボイス対応、PDF出力、顧客管理、履歴保存を月額980円から利用できます。"
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={styles.content} lightColor="transparent" darkColor="transparent">
          <View style={styles.hero} lightColor="transparent" darkColor="transparent">
            <View style={styles.heroCopy} lightColor="transparent" darkColor="transparent">
              <Text style={styles.eyebrow}>個人事業主・フリーランス向け</Text>
              <Text style={styles.title}>AI請求書・見積書作成</Text>
              <Text style={styles.description}>
                インボイス対応、PDF出力、顧客管理、履歴保存をブラウザに集約。月3回まで無料で試せて、Proなら月額980円で無制限に使えます。
              </Text>
              <View style={styles.heroFeatures} lightColor="transparent" darkColor="transparent">
                {['インボイス対応', 'PDF出力', '顧客管理', '履歴保存'].map((feature) => (
                  <Text key={feature} style={styles.heroFeature}>
                    {feature}
                  </Text>
                ))}
              </View>
              <Text style={styles.heroPrice}>月額980円</Text>
              <View style={styles.ctaRow} lightColor="transparent" darkColor="transparent">
                <Link
                  href={{
                    pathname: '/estimate',
                    params: sampleEstimateParams,
                  }}
                  style={styles.secondaryLink}>
                  無料で試す
                </Link>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    if (proPlan?.paymentLink) {
                      handleOpenPaymentLink(proPlan.paymentLink);
                    }
                  }}>
                  <Text style={styles.primaryButtonText} lightColor="#ffffff" darkColor="#ffffff">
                    980円で始める
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.microCopy}>Freeは月3件まで。クレジットカード決済はStripeで安全に処理されます。</Text>
            </View>
            <View style={styles.heroPreview}>
              <Text style={styles.previewLabel}>今月の業務</Text>
              <View style={styles.previewRow} lightColor="transparent" darkColor="transparent">
                <Text style={styles.previewTitle}>コーポレートサイト制作</Text>
                <Text style={styles.previewAmount}>192,000円</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.previewMetrics} lightColor="transparent" darkColor="transparent">
                <View style={styles.previewMetric} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.previewMetricValue}>2 / 3</Text>
                  <Text style={styles.previewMetricLabel}>Free利用</Text>
                </View>
                <View style={styles.previewMetric} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.previewMetricValue}>PDF</Text>
                  <Text style={styles.previewMetricLabel}>即出力</Text>
                </View>
              </View>
              <Text style={styles.previewNote}>Proなら作成件数は無制限</Text>
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
              <Text style={styles.panelTitle}>料金比較</Text>
              <Text style={styles.panelMeta}>まずFreeで試し、毎月使うならPro月980円で件数制限を外せます。</Text>
            </View>
            <View style={styles.planCards} lightColor="transparent" darkColor="transparent">
              {billingPlans.map((plan) => (
                <View
                  key={plan.key}
                  style={[styles.planCard, plan.key === 'pro' ? styles.recommendedPlan : undefined]}
                  lightColor="transparent"
                  darkColor="transparent">
                  <Text style={styles.planName}>{plan.title}</Text>
                  <Text style={styles.planPrice}>月額{plan.monthlyPrice}</Text>
                  <Text style={styles.rowSub}>{plan.description}</Text>
                  <View style={styles.featureList} lightColor="transparent" darkColor="transparent">
                    {plan.features.map((feature) => (
                      <Text key={feature} style={styles.planFeature}>
                        ✓ {feature}
                      </Text>
                    ))}
                  </View>
                  {plan.paymentLink ? (
                    <Pressable style={styles.planButton} onPress={() => handleOpenPaymentLink(plan.paymentLink!)}>
                      <Text style={styles.planButtonText} lightColor="#ffffff" darkColor="#ffffff">
                        {plan.key === 'pro' ? '980円で始める' : '2,980円で始める'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Link
                      href={{
                        pathname: '/estimate',
                        params: sampleEstimateParams,
                      }}
                      style={styles.secondaryLink}>
                      無料で試す
                    </Link>
                  )}
                </View>
              ))}
            </View>
            <View style={styles.comparisonTable} lightColor="transparent" darkColor="transparent">
              <View style={styles.comparisonHeader} lightColor="transparent" darkColor="transparent">
                <Text style={styles.comparisonFeature}>機能</Text>
                <Text style={styles.comparisonCell}>Free</Text>
                <Text style={styles.comparisonCell}>Pro</Text>
                <Text style={styles.comparisonCell}>Business</Text>
              </View>
              {comparisonRows.map((row) => (
                <View key={row.feature} style={styles.comparisonRow} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.comparisonFeature}>{row.feature}</Text>
                  <Text style={styles.comparisonCell}>{row.free}</Text>
                  <Text style={styles.comparisonCell}>{row.pro}</Text>
                  <Text style={styles.comparisonCell}>{row.business}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>利用事例</Text>
              <Text style={styles.panelMeta}>案件単位で見積・請求・顧客をまとめたい個人事業主に向いています。</Text>
            </View>
            {useCases.map((useCase) => (
              <View key={useCase.title} style={styles.useCaseCard} lightColor="transparent" darkColor="transparent">
                <Text style={styles.rowTitle}>{useCase.title}</Text>
                <Text style={styles.rowSub}>{useCase.description}</Text>
                <Text style={styles.status}>{useCase.result}</Text>
              </View>
            ))}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>よくある質問</Text>
              <Text style={styles.panelMeta}>導入前に確認されやすい料金、制限、使い方をまとめました。</Text>
            </View>
            {faqItems.map((item) => (
              <View key={item.question} style={styles.faqItem} lightColor="transparent" darkColor="transparent">
                <Text style={styles.faqQuestion}>Q. {item.question}</Text>
                <Text style={styles.faqAnswer}>A. {item.answer}</Text>
              </View>
            ))}
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
    maxWidth: 760,
    gap: 14,
  },
  hero: {
    borderWidth: 1,
    borderColor: '#dbe7ff',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 18,
    padding: 18,
  },
  heroCopy: {
    gap: 12,
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
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 38,
  },
  description: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
  },
  heroFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroFeature: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroPrice: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  ctaRow: {
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
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
  microCopy: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  heroPreview: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 12,
    padding: 16,
  },
  previewLabel: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
  },
  previewRow: {
    gap: 4,
  },
  previewTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  previewAmount: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  previewMetrics: {
    flexDirection: 'row',
    gap: 10,
  },
  previewMetric: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  previewMetricValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  previewMetricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  previewNote: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
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
  planCards: {
    gap: 10,
  },
  planCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 8,
    padding: 14,
  },
  recommendedPlan: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  planName: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  planPrice: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  featureList: {
    gap: 5,
  },
  planFeature: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
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
  comparisonTable: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  comparisonHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
  },
  comparisonRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  comparisonFeature: {
    flex: 1.2,
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  comparisonCell: {
    flex: 1,
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  useCaseCard: {
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    gap: 5,
    paddingTop: 12,
  },
  faqItem: {
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    gap: 5,
    paddingTop: 12,
  },
  faqQuestion: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  faqAnswer: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
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
