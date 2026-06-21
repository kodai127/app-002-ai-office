import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Link } from 'expo-router';
import { User } from '@supabase/supabase-js';

import { AppHeader } from '@/components/AppHeader';
import { Text, View } from '@/components/Themed';
import { SeoHead } from '@/components/SeoHead';
import { billingPlans } from '@/lib/billing';
import { getCurrentUser } from '@/lib/auth';
import {
  formatCurrency,
  getProjectStatusLabel,
  isOverdue,
  mockEstimateRecords,
  mockInvoiceRecords,
  ProjectRecord,
} from '@/lib/officeData';
import {
  BillingProfile,
  fetchCustomers,
  fetchEstimateRecords,
  fetchInvoiceRecords,
  fetchOrCreateProfile,
  fetchProjectRecords,
  fetchUsageSummary,
  summarizeProjects,
  UsageSummary,
} from '@/lib/supabaseRepositories';

const sampleEstimateParams = {
  customerName: '株式会社サンプル',
  hourlyRate: '8000',
  hours: '24',
  projectName: 'コーポレートサイト制作',
  workDescription: '要件整理、デザイン調整、Webサイト実装、公開作業',
};

const appFeatures = [
  '案件ごとに見積・請求・入金ステータスを管理',
  '未入金と期限超過をスマホで確認',
  '見積書・請求書のPDF出力に対応',
  '顧客管理と請求履歴をまとめて確認',
];

const usageSteps = [
  '案件名、顧客、金額、期限、メモを登録します。',
  '案件から見積書を作成し、受注後に請求書へ変換します。',
  '請求済み案件の未入金と期限超過を確認します。',
  '入金確認後にステータスを入金済みに変更します。',
];

const useCases = [
  {
    title: 'Web制作フリーランス',
    description: 'Web制作案件ごとに見積、請求、入金予定日をまとめて管理できます。',
    result: '未入金の見落としを削減',
  },
  {
    title: '業務委託エンジニア',
    description: '動画編集やAI開発のスポット案件を、請求済み・入金済みで整理できます。',
    result: '案件ごとの請求状況を可視化',
  },
  {
    title: '個人事業主の継続案件',
    description: 'デザイン、ライター案件の顧客メモと支払期限をまとめて確認できます。',
    result: '入金確認までの流れを標準化',
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
  { feature: '案件管理', free: '3件まで', pro: '無制限', business: '無制限' },
  { feature: '見積書・請求書作成', free: '対応', pro: '対応', business: '対応' },
  { feature: 'PDF出力', free: '対応', pro: '対応', business: '対応' },
  { feature: '顧客管理', free: '体験のみ', pro: '対応', business: '対応' },
  { feature: '履歴保存', free: '制限あり', pro: '無制限', business: '無制限' },
  { feature: 'おすすめ対象', free: '試用', pro: '個人事業主', business: '小規模チーム' },
];

function getPlanLabel(plan?: string) {
  if (plan === 'business') {
    return 'Business';
  }

  if (plan === 'pro') {
    return 'Pro';
  }

  return 'Free';
}

export default function HomeScreen() {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customerCount, setCustomerCount] = useState(0);
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [projectStatusMessage, setProjectStatusMessage] = useState('ログインすると案件ダッシュボードを表示できます。');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [estimateCount, setEstimateCount] = useState(mockEstimateRecords.length);
  const [invoiceCount, setInvoiceCount] = useState(mockInvoiceRecords.length);
  const proPlan = billingPlans.find((plan) => plan.key === 'pro');
  const projectSummary = useMemo(() => summarizeProjects(projects), [projects]);
  const unpaidProjects = useMemo(() => projects.filter((project) => project.status === 'invoiced'), [projects]);
  const overdueUnpaidProjects = useMemo(
    () => unpaidProjects.filter((project) => isOverdue(project.dueDate)),
    [unpaidProjects]
  );
  const sortedUnpaidProjects = useMemo(
    () =>
      [...unpaidProjects].sort((left, right) => {
        const leftOverdue = isOverdue(left.dueDate) ? 1 : 0;
        const rightOverdue = isOverdue(right.dueDate) ? 1 : 0;
        return rightOverdue - leftOverdue;
      }),
    [unpaidProjects]
  );
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

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const [authUser, usage] = await Promise.all([getCurrentUser(), fetchUsageSummary()]);

        if (!isMounted) {
          return;
        }

        setCurrentUser(authUser);
        setUsageSummary(usage);

        if (!authUser) {
          setProjectStatusMessage('ログインすると案件ダッシュボードを表示できます。');
          return;
        }

        const [nextProfile, estimates, invoices, nextProjects, nextCustomers] = await Promise.all([
          fetchOrCreateProfile(),
          fetchEstimateRecords(),
          fetchInvoiceRecords(),
          fetchProjectRecords(),
          fetchCustomers(),
        ]);

        if (!isMounted) {
          return;
        }

        setProfile(nextProfile);
        setEstimateCount(estimates.length);
        setInvoiceCount(invoices.length);
        setProjects(nextProjects);
        setCustomerCount(nextCustomers.length);
        setProjectStatusMessage(nextProjects.length > 0 ? 'Supabaseから案件を集計しています。' : 'まだ保存済み案件はありません。');
      } catch {
        if (isMounted) {
          setUsageSummary((currentSummary) => currentSummary ?? null);
          setProjectStatusMessage('案件の読み込みに失敗しました。ログイン状態とSupabase設定を確認してください。');
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <SeoHead
        title="フリーランスの案件管理SaaS"
        description="AI Officeは、フリーランス向けに案件、見積、請求、入金確認を1画面で管理するSaaSです。月3件まで無料、Proは月980円で利用できます。"
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <AppHeader />
        <View style={styles.content} lightColor="transparent" darkColor="transparent">
          <View style={styles.dashboardHero}>
            <View style={styles.dashboardHeader} lightColor="transparent" darkColor="transparent">
              <View style={styles.welcomeCopy} lightColor="transparent" darkColor="transparent">
                <Text style={styles.eyebrow}>Dashboard</Text>
                <Text style={styles.dashboardTitle}>
                  {currentUser?.email ? '案件の状況を確認' : '案件ダッシュボード'}
                </Text>
                <Text style={styles.dashboardText}>
                  案件、見積、請求、入金確認までをスマホから1画面で管理できます。
                </Text>
              </View>
              <View style={styles.planPill}>
                <Text style={styles.planPillLabel}>現在プラン</Text>
                <Text style={styles.planPillValue}>{getPlanLabel(profile?.plan ?? usageSummary?.plan)}</Text>
              </View>
            </View>
            <View style={styles.dashboardGrid} lightColor="transparent" darkColor="transparent">
              <DashboardCard
                label="今月売上"
                value={formatCurrency(projectSummary.monthlyRevenue)}
                note="入金済み案件"
              />
              <DashboardCard
                label="未入金"
                value={`${projectSummary.invoicedCount}件`}
                note={`総額 ${formatCurrency(projectSummary.outstandingAmount)}`}
                danger
              />
              <DashboardCard label="案件数" value={`${projects.length}件`} note={`${projectSummary.activeCount}件が進行中`} />
              <DashboardCard label="顧客数" value={`${customerCount}社`} note="Supabase顧客管理" />
              <DashboardCard
                label="期限切れ"
                value={`${overdueUnpaidProjects.length}件`}
                note="期限超過の未入金"
                danger={overdueUnpaidProjects.length > 0}
              />
              <DashboardCard
                label="無料枠残数"
                value={usageSummary?.remaining === null ? '無制限' : `${usageSummary?.remaining ?? 3}回`}
                note={usageSummary?.limit === null ? 'Pro/Business' : '今月のFree残数'}
              />
            </View>
            <View style={styles.dashboardActions} lightColor="transparent" darkColor="transparent">
              <Link href={'/projects' as never} style={styles.dashboardPrimaryLink}>
                案件を管理
              </Link>
              <Link href="/estimate" style={styles.dashboardSecondaryLink}>
                案件から見積を作成
              </Link>
            </View>
            <Text style={styles.microCopy}>{projectStatusMessage}</Text>
          </View>

          <View style={styles.hero} lightColor="transparent" darkColor="transparent">
            <View style={styles.heroCopy} lightColor="transparent" darkColor="transparent">
              <Text style={styles.eyebrow}>Web制作・動画編集・AI開発・デザイン・ライター向け</Text>
              <Text style={styles.title}>フリーランスの案件管理を、請求までひとまとめに。</Text>
              <Text style={styles.description}>
                案件が決まったら、見積・請求・入金確認まで1画面で管理。月3件まで無料、Proは月980円で利用できます。
              </Text>
              <View style={styles.flowBox} lightColor="transparent" darkColor="transparent">
                {['案件', '見積', '請求', '入金確認'].map((step, index) => (
                  <View key={step} style={styles.flowStep} lightColor="transparent" darkColor="transparent">
                    <Text style={styles.flowText}>{step}</Text>
                    {index < 3 ? <Text style={styles.flowArrow}>↓</Text> : null}
                  </View>
                ))}
              </View>
              <View style={styles.heroFeatures} lightColor="transparent" darkColor="transparent">
                {['案件カード', '未入金管理', 'PDF出力', '顧客管理'].map((feature) => (
                  <Text key={feature} style={styles.heroFeature}>
                    {feature}
                  </Text>
                ))}
              </View>
              <Text style={styles.heroPrice}>月3件まで無料。Proは月980円。</Text>
              <View style={styles.ctaRow} lightColor="transparent" darkColor="transparent">
                <Link
                  href={{
                    pathname: '/projects' as never,
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
              <Text style={styles.previewLabel}>案件ボード</Text>
              <View style={styles.previewRow} lightColor="transparent" darkColor="transparent">
                <Text style={styles.previewTitle}>コーポレートサイト改善</Text>
                <Text style={styles.previewAmount}>{formatCurrency(projectSummary.outstandingAmount)}</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.previewMetrics} lightColor="transparent" darkColor="transparent">
                <View style={styles.previewMetric} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.previewMetricValue}>{projectSummary.invoicedCount}件</Text>
                  <Text style={styles.previewMetricLabel}>未入金</Text>
                </View>
                <View style={styles.previewMetric} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.previewMetricValue}>{projectSummary.activeCount}件</Text>
                  <Text style={styles.previewMetricLabel}>進行中</Text>
                </View>
              </View>
              <Text style={styles.previewNote}>未入金を目立たせ、入金確認まで追えます。</Text>
            </View>
          </View>

          <View style={[styles.panel, styles.unpaidPanel]}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>未入金一覧</Text>
              <Text style={styles.panelMeta}>請求済みで入金待ちの案件を優先表示します。</Text>
            </View>
            {sortedUnpaidProjects.length > 0 ? (
              sortedUnpaidProjects.map((project) => (
                  <View key={project.id} style={styles.projectRow} lightColor="transparent" darkColor="transparent">
                    <View style={styles.rowBody} lightColor="transparent" darkColor="transparent">
                      <Text style={styles.rowTitle} numberOfLines={2} ellipsizeMode="tail">
                        {project.name}
                      </Text>
                      <Text style={styles.rowSub}>
                        {project.customerName} / 期限 {project.dueDate}
                        {isOverdue(project.dueDate) ? ' / 期限超過' : ''}
                      </Text>
                    </View>
                    <View style={styles.rowSide} lightColor="transparent" darkColor="transparent">
                      <Text style={styles.rowAmount}>{formatCurrency(project.amount)}</Text>
                      <Link href={`/projects/${project.id}` as never} style={styles.status}>
                        詳細確認
                      </Link>
                    </View>
                  </View>
                ))
            ) : (
              <Text style={styles.rowSub}>未入金の案件はありません。</Text>
            )}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>案件カード</Text>
              <Text style={styles.panelMeta}>案件ステータスを見積前、見積済み、請求済み、入金済みで管理します。</Text>
            </View>
            {projects.length > 0 ? (
              projects.slice(0, 3).map((project) => (
                <View key={project.id} style={styles.projectRow} lightColor="transparent" darkColor="transparent">
                  <View style={styles.rowBody} lightColor="transparent" darkColor="transparent">
                    <Text style={styles.rowTitle} numberOfLines={2} ellipsizeMode="tail">
                      {project.name}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={2} ellipsizeMode="tail">
                      {project.customerName}
                    </Text>
                  </View>
                  <View style={styles.rowSide} lightColor="transparent" darkColor="transparent">
                    <Text style={styles.rowAmount}>{formatCurrency(project.amount)}</Text>
                    <Link href={`/projects/${project.id}` as never} style={styles.status}>
                      {getProjectStatusLabel(project.status)}
                    </Link>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.rowSub}>案件画面から最初の案件を保存してください。</Text>
            )}
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
            <KpiCard label="今月売上" value={formatCurrency(projectSummary.monthlyRevenue)} trend="入金済み案件" />
            <KpiCard label="未入金額" value={formatCurrency(projectSummary.outstandingAmount)} trend="請求済み・入金待ち" />
            <KpiCard label="顧客数" value={`${customerCount}社`} trend="Supabase顧客管理" />
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
              <Link href="https://x.com/dai_k65852" target="_blank" style={styles.externalLink}>
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

function DashboardCard({ danger, label, note, value }: { danger?: boolean; label: string; note: string; value: string }) {
  return (
    <View style={[styles.dashboardCard, danger ? styles.dashboardCardDanger : undefined]}>
      <Text style={styles.dashboardCardLabel}>{label}</Text>
      <Text style={[styles.dashboardCardValue, danger ? styles.dangerText : undefined]}>{value}</Text>
      <Text style={styles.dashboardCardNote}>{note}</Text>
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
    backgroundColor: '#f8fafc',
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
  },
  content: {
    width: '100%',
    maxWidth: 760,
    gap: 12,
  },
  dashboardHero: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 16,
    padding: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 3,
  },
  dashboardHeader: {
    gap: 12,
  },
  welcomeCopy: {
    gap: 6,
  },
  dashboardTitle: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  dashboardText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
  },
  planPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  planPillLabel: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '900',
  },
  planPillValue: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dashboardCard: {
    flexBasis: 145,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    padding: 14,
    gap: 5,
  },
  dashboardCardDanger: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  dashboardCardLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '900',
  },
  dashboardCardValue: {
    color: '#0f172a',
    fontSize: 25,
    fontWeight: '900',
  },
  dashboardCardNote: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  dangerText: {
    color: '#dc2626',
  },
  dashboardActions: {
    gap: 10,
  },
  dashboardPrimaryLink: {
    overflow: 'hidden',
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
  },
  dashboardSecondaryLink: {
    overflow: 'hidden',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '900',
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
  },
  hero: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 18,
    padding: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 2,
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
    color: '#0f172a',
    fontSize: 30,
    fontWeight: '900',
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
  flowBox: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 4,
    padding: 12,
  },
  flowStep: {
    alignItems: 'center',
    gap: 3,
  },
  flowText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
  },
  flowArrow: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '900',
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
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  primaryLink: {
    overflow: 'hidden',
    minHeight: 48,
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
    borderColor: '#dbeafe',
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
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
  },
  kpiGrid: {
    gap: 10,
  },
  kpiCard: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 2,
  },
  kpiLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '900',
  },
  kpiValue: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '900',
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
    borderColor: '#dbeafe',
    borderRadius: 8,
    padding: 17,
    backgroundColor: '#ffffff',
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.035,
    shadowRadius: 18,
    elevation: 1,
  },
  unpaidPanel: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
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
  projectRow: {
    alignItems: 'flex-start',
    width: '100%',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 8,
    padding: 12,
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
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 8,
    padding: 15,
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
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  planButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
  rowBody: {
    width: '100%',
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
    width: '100%',
    gap: 3,
  },
  rowAmount: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  status: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
  },
  comparisonTable: {
    borderWidth: 1,
    borderColor: '#dbeafe',
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
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: '#f8fafc',
    color: '#111827',
    fontSize: 16,
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  contactButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  linkPanel: {
    borderWidth: 1,
    borderColor: '#dbeafe',
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
    minHeight: 44,
  },
});
