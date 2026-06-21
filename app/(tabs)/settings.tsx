import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { User } from '@supabase/supabase-js';

import { AppHeader } from '@/components/AppHeader';
import { AuthPanel } from '@/components/AuthPanel';
import { SeoHead } from '@/components/SeoHead';
import { Text, View } from '@/components/Themed';
import { UsageLimitPanel } from '@/components/UsageLimitPanel';
import { getCurrentUser } from '@/lib/auth';
import { billingPlans, openBillingLink } from '@/lib/billing';
import {
  Customer,
  EstimateRecord,
  formatCurrency,
  InvoiceRecord,
  mockCustomers,
  mockEstimateRecords,
  mockInvoiceRecords,
  supabaseTableDefinitions,
} from '@/lib/officeData';
import { getSupabaseSetupMessage } from '@/lib/supabaseClient';
import {
  createCustomerDraft,
  BillingProfile,
  fetchOrCreateProfile,
  fetchCustomers,
  fetchEstimateRecords,
  fetchInvoiceRecords,
  fetchUsageSummary,
  UsageSummary,
  upsertCustomer,
} from '@/lib/supabaseRepositories';

type TabKey = 'dashboard' | 'customers' | 'estimates' | 'invoices' | 'billing' | 'mypage' | 'supabase';

const pricingComparisonRows = [
  { feature: '月間利用回数', free: '月3回', pro: '無制限', business: '無制限' },
  { feature: '見積書作成', free: '対応', pro: '対応', business: '対応' },
  { feature: '請求書作成', free: '対応', pro: '対応', business: '対応' },
  { feature: 'PDF出力', free: '対応', pro: '対応', business: '対応' },
  { feature: '顧客管理', free: '制限あり', pro: '対応', business: '対応' },
  { feature: '履歴保存', free: '制限あり', pro: '対応', business: '対応' },
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

export default function SettingsScreen() {
  const params = useLocalSearchParams<{ checkout?: string; tab?: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [estimateRecords, setEstimateRecords] = useState<EstimateRecord[]>(mockEstimateRecords);
  const [invoiceRecords, setInvoiceRecords] = useState<InvoiceRecord[]>(mockInvoiceRecords);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState(customers[0]?.id ?? '');
  const [billingStatus, setBillingStatus] = useState('Freeプラン: ローカル保存とPDF出力を試せます。');
  const [syncStatus, setSyncStatus] = useState(getSupabaseSetupMessage());
  const editingCustomer = customers.find((customer) => customer.id === editingCustomerId) ?? customers[0];
  const customerForm = useMemo(
    () => ({
      address: editingCustomer?.address ?? '',
      contactName: editingCustomer?.contactName ?? '',
      email: editingCustomer?.email ?? '',
      memo: editingCustomer?.memo ?? '',
      name: editingCustomer?.name ?? '',
      phone: editingCustomer?.phone ?? '',
    }),
    [editingCustomer]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadDbRecords() {
      try {
        const [authUser, usage] = await Promise.all([getCurrentUser(), fetchUsageSummary()]);

        if (!isMounted) {
          return;
        }

        setCurrentUser(authUser);
        setUsageSummary(usage);

        if (!authUser) {
          setSyncStatus('ログインすると顧客・見積履歴・請求書履歴をクラウド保存できます。');
          return;
        }

        const [dbCustomers, dbEstimates, dbInvoices, nextProfile] = await Promise.all([
          fetchCustomers(),
          fetchEstimateRecords(),
          fetchInvoiceRecords(),
          fetchOrCreateProfile(),
        ]);

        if (!isMounted) {
          return;
        }

        if (dbCustomers.length > 0) {
          setCustomers(dbCustomers);
          setEditingCustomerId(dbCustomers[0].id);
        }
        setEstimateRecords(dbEstimates.length > 0 ? dbEstimates : mockEstimateRecords);
        setInvoiceRecords(dbInvoices.length > 0 ? dbInvoices : mockInvoiceRecords);
        setProfile(nextProfile);
        setBillingStatus(`${getPlanLabel(nextProfile.plan)}プラン / 状態: ${nextProfile.subscriptionStatus}`);
        setSyncStatus('Supabaseから顧客・見積履歴・請求書履歴を読み込みました。');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Supabaseの読み込みに失敗しました。';
        setSyncStatus(`${message} サンプルデータを表示しています。`);
      }
    }

    loadDbRecords();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const nextTab = params.tab as TabKey | undefined;
    const validTabs: TabKey[] = ['dashboard', 'customers', 'estimates', 'invoices', 'billing', 'mypage', 'supabase'];

    if (nextTab && validTabs.includes(nextTab)) {
      setActiveTab(nextTab);
    }
  }, [params.tab]);

  useEffect(() => {
    if (params.checkout === 'success') {
      setActiveTab('billing');
      setBillingStatus('決済が完了しました。Stripe Webhook反映後にプラン状態が更新されます。');
    }

    if (params.checkout === 'cancel') {
      setActiveTab('billing');
      setBillingStatus('決済はキャンセルされました。必要に応じて再度お申し込みください。');
    }
  }, [params.checkout]);

  const handleCustomerChange = (field: keyof typeof customerForm, value: string) => {
    if (!editingCustomer) {
      return;
    }

    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) =>
        customer.id === editingCustomer.id
          ? {
              ...customer,
              [field]: value,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : customer
      )
    );
  };

  const handleOpenBilling = async (planKey: 'free' | 'pro' | 'business') => {
    const plan = billingPlans.find((billingPlan) => billingPlan.key === planKey);

    if (!plan) {
      return;
    }

    if (plan.key === 'free') {
      setBillingStatus('Freeプランを利用中です。Pro以上で顧客管理と履歴保存を本格利用できます。');
      return;
    }

    setBillingStatus(`${plan.title}の決済ページを開いています...`);

    try {
      await openBillingLink(plan);
      setBillingStatus(`${plan.title}のStripe決済ページを開きました。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Stripe決済ページを開けませんでした。';
      setBillingStatus(message);
    }
  };

  const handleAddCustomer = async () => {
    const nextCustomer = createCustomerDraft(customers.length + 1);

    setCustomers((currentCustomers) => [nextCustomer, ...currentCustomers]);
    setEditingCustomerId(nextCustomer.id);
    setActiveTab('customers');
    setSyncStatus('顧客をDBに保存しています...');

    try {
      const savedCustomer = await upsertCustomer(nextCustomer);
      setCustomers((currentCustomers) =>
        currentCustomers.map((customer) => (customer.id === nextCustomer.id ? savedCustomer : customer))
      );
      setEditingCustomerId(savedCustomer.id);
      setSyncStatus('顧客をDBに追加しました。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '顧客追加のDB保存に失敗しました。';
      setSyncStatus(`${message} 画面上には追加済みです。`);
    }
  };

  const handleSaveCustomer = async () => {
    if (!editingCustomer) {
      return;
    }

    setSyncStatus('顧客情報をDBに保存しています...');

    try {
      const savedCustomer = await upsertCustomer(editingCustomer);
      setCustomers((currentCustomers) =>
        currentCustomers.map((customer) => (customer.id === savedCustomer.id ? savedCustomer : customer))
      );
      setEditingCustomerId(savedCustomer.id);
      setSyncStatus('顧客情報をDBに保存しました。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '顧客情報のDB保存に失敗しました。';
      setSyncStatus(message);
    }
  };

  return (
    <>
      <SeoHead
        title="顧客・履歴管理"
        description="顧客情報、見積履歴、請求書履歴をブラウザで管理できるAI Officeの管理画面です。"
        path="/settings"
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <AppHeader />
        <View style={styles.content} lightColor="transparent" darkColor="transparent">
          <View style={styles.header} lightColor="transparent" darkColor="transparent">
            <Text style={styles.eyebrow}>Workspace</Text>
            <Text style={styles.title}>管理</Text>
            <Text style={styles.description}>
              ログイン、顧客、見積履歴、請求書履歴、月額プランをまとめて管理します。
            </Text>
            <Text style={styles.syncStatus}>{syncStatus}</Text>
          </View>

          <UsageLimitPanel refreshKey={billingStatus} />

          <View style={styles.segmented} lightColor="transparent" darkColor="transparent">
            <SegmentButton active={activeTab === 'dashboard'} label="ダッシュボード" onPress={() => setActiveTab('dashboard')} />
            <SegmentButton active={activeTab === 'customers'} label="顧客" onPress={() => setActiveTab('customers')} />
            <SegmentButton active={activeTab === 'estimates'} label="見積" onPress={() => setActiveTab('estimates')} />
            <SegmentButton active={activeTab === 'invoices'} label="請求" onPress={() => setActiveTab('invoices')} />
            <SegmentButton active={activeTab === 'billing'} label="料金" onPress={() => setActiveTab('billing')} />
            <SegmentButton active={activeTab === 'mypage'} label="マイページ" onPress={() => setActiveTab('mypage')} />
            <SegmentButton active={activeTab === 'supabase'} label="DB設計" onPress={() => setActiveTab('supabase')} />
          </View>

          {activeTab === 'dashboard' ? (
            <View style={styles.panel}>
              <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
                <View lightColor="transparent" darkColor="transparent">
                  <Text style={styles.panelTitle}>ダッシュボード</Text>
                  <Text style={styles.panelMeta}>現在の利用状況、保存件数、プラン状態をまとめて確認できます。</Text>
                </View>
              </View>
              <View style={styles.metricGrid} lightColor="transparent" darkColor="transparent">
                <MetricCard
                  label="現在プラン"
                  note={profile?.subscriptionStatus ?? usageSummary?.subscriptionStatus ?? '未ログイン'}
                  value={getPlanLabel(profile?.plan ?? usageSummary?.plan)}
                />
                <MetricCard
                  label="今月利用数"
                  note={usageSummary?.limit === null ? 'Pro/Businessは無制限' : 'Freeは月3回まで無料'}
                  value={`${usageSummary?.used ?? 0}件`}
                />
                <MetricCard
                  label="残り利用回数"
                  note="見積書・請求書のクラウド保存"
                  value={usageSummary?.remaining === null ? '無制限' : `${usageSummary?.remaining ?? 3}回`}
                />
                <MetricCard label="見積件数" note="保存済み見積書" value={`${estimateRecords.length}件`} />
                <MetricCard label="請求件数" note="保存済み請求書" value={`${invoiceRecords.length}件`} />
                <MetricCard label="顧客数" note="管理中の顧客" value={`${customers.length}社`} />
              </View>
              {usageSummary?.remaining === 0 ? (
                <View style={styles.upgradeBox}>
                  <Text style={styles.rowTitle}>無料枠を使い切りました</Text>
                  <Text style={styles.rowSub}>Proなら月額980円で見積書・請求書を無制限に保存できます。</Text>
                  <Pressable style={styles.primaryButton} onPress={() => handleOpenBilling('pro')}>
                    <Text style={styles.primaryButtonText} lightColor="#ffffff" darkColor="#ffffff">
                      Proで無制限利用
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}

          {activeTab === 'customers' ? (
          <>
            <View style={styles.panel}>
              <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
                <View lightColor="transparent" darkColor="transparent">
                  <Text style={styles.panelTitle}>顧客一覧</Text>
                  <Text style={styles.panelMeta}>{customers.length}社を管理中</Text>
                </View>
                <Pressable style={styles.primaryButton} onPress={handleAddCustomer}>
                  <Text style={styles.primaryButtonText} lightColor="#ffffff" darkColor="#ffffff">
                    顧客追加
                  </Text>
                </Pressable>
              </View>

              {customers.map((customer) => (
                <Pressable
                  key={customer.id}
                  style={[styles.customerRow, customer.id === editingCustomer?.id ? styles.activeRow : undefined]}
                  onPress={() => setEditingCustomerId(customer.id)}>
                  <View style={styles.rowBody} lightColor="transparent" darkColor="transparent">
                    <Text style={styles.rowTitle}>{customer.name}</Text>
                    <Text style={styles.rowSub}>
                      {customer.contactName || '担当者未設定'} / {customer.email || 'メール未設定'}
                    </Text>
                  </View>
                  <Text style={styles.status}>{customer.updatedAt}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
                <View lightColor="transparent" darkColor="transparent">
                  <Text style={styles.panelTitle}>顧客編集</Text>
                  <Text style={styles.panelMeta}>選択中の顧客情報を編集できます。</Text>
                </View>
              </View>
              <Field
                label="顧客名"
                value={customerForm.name}
                onChangeText={(value) => handleCustomerChange('name', value)}
                placeholder="株式会社サンプル"
              />
              <Field
                label="担当者"
                value={customerForm.contactName}
                onChangeText={(value) => handleCustomerChange('contactName', value)}
                placeholder="山田 太郎"
              />
              <Field
                label="メール"
                value={customerForm.email}
                onChangeText={(value) => handleCustomerChange('email', value)}
                placeholder="client@example.com"
                keyboardType="email-address"
              />
              <Field
                label="電話番号"
                value={customerForm.phone}
                onChangeText={(value) => handleCustomerChange('phone', value)}
                placeholder="03-1234-5678"
                keyboardType="phone-pad"
              />
              <Field
                label="住所"
                value={customerForm.address}
                onChangeText={(value) => handleCustomerChange('address', value)}
                placeholder="東京都..."
              />
              <Field
                label="メモ"
                value={customerForm.memo}
                onChangeText={(value) => handleCustomerChange('memo', value)}
                placeholder="支払条件や商談メモ"
                multiline
              />
              <Pressable style={styles.primaryButton} onPress={handleSaveCustomer}>
                <Text style={styles.primaryButtonText} lightColor="#ffffff" darkColor="#ffffff">
                  顧客情報をDB保存
                </Text>
              </Pressable>
            </View>
          </>
          ) : null}

          {activeTab === 'estimates' ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <View lightColor="transparent" darkColor="transparent">
                <Text style={styles.panelTitle}>見積履歴</Text>
                <Text style={styles.panelMeta}>過去の見積保存、一覧表示、再編集のUIです。</Text>
              </View>
            </View>
            {estimateRecords.map((estimate) => (
              <View key={estimate.id} style={styles.historyCard}>
                <View style={styles.rowBody} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.rowTitle}>{estimate.projectName}</Text>
                  <Text style={styles.rowSub}>
                    {estimate.customerName} / {estimate.issuedAt}
                  </Text>
                </View>
                <View style={styles.historyFooter} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.rowAmount}>{formatCurrency(estimate.amount)}</Text>
                  <Pressable style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>再編集</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
          ) : null}

          {activeTab === 'invoices' ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <View lightColor="transparent" darkColor="transparent">
                <Text style={styles.panelTitle}>請求書履歴</Text>
                <Text style={styles.panelMeta}>過去の請求書保存と一覧表示のUIです。</Text>
              </View>
            </View>
            {invoiceRecords.map((invoice) => (
              <View key={invoice.id} style={styles.historyCard}>
                <View style={styles.rowBody} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.rowTitle}>{invoice.invoiceNumber}</Text>
                  <Text style={styles.rowSub}>
                    {invoice.customerName} / 期限 {invoice.dueDate}
                  </Text>
                </View>
                <View style={styles.historyFooter} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.rowAmount}>{formatCurrency(invoice.amount)}</Text>
                  <Text style={styles.status}>{invoice.status === 'paid' ? '入金済み' : '未入金'}</Text>
                </View>
              </View>
            ))}
          </View>
          ) : null}

          {activeTab === 'billing' ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <View lightColor="transparent" darkColor="transparent">
                <Text style={styles.panelTitle}>料金プラン</Text>
                <Text style={styles.panelMeta}>月300万円を目標に、FreeからPro/Businessへアップグレードする導線です。</Text>
              </View>
              <Text style={styles.syncStatus}>{billingStatus}</Text>
            </View>
            {billingPlans.map((plan) => (
              <View key={plan.key} style={styles.planCard}>
                <View style={styles.rowBody} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.rowTitle}>{plan.title}</Text>
                  <Text style={styles.planPrice}>
                    {plan.key === 'free' ? '月3回まで無料' : plan.key === 'pro' ? '980円/月' : '2980円/月'}
                  </Text>
                  <Text style={styles.rowSub}>{plan.description}</Text>
                </View>
                {plan.features.map((feature) => (
                  <Text key={feature} style={styles.planFeature}>・{feature}</Text>
                ))}
                <Pressable
                  style={plan.key === 'free' ? styles.secondaryButton : styles.primaryButton}
                  onPress={() => handleOpenBilling(plan.key)}>
                  <Text
                    style={plan.key === 'free' ? styles.secondaryButtonText : styles.primaryButtonText}
                    lightColor={plan.key === 'free' ? '#2563eb' : '#ffffff'}
                    darkColor={plan.key === 'free' ? '#2563eb' : '#ffffff'}>
                    {plan.key === 'free'
                      ? 'Freeで始める'
                      : plan.key === 'pro'
                        ? '980円で始める'
                        : '2,980円で始める'}
                  </Text>
                </Pressable>
              </View>
            ))}
            <View style={styles.comparisonTable}>
              <View style={styles.comparisonHeader} lightColor="transparent" darkColor="transparent">
                <Text style={styles.comparisonFeature}>機能</Text>
                <Text style={styles.comparisonCell}>Free</Text>
                <Text style={styles.comparisonCell}>Pro</Text>
                <Text style={styles.comparisonCell}>Business</Text>
              </View>
              {pricingComparisonRows.map((row) => (
                <View key={row.feature} style={styles.comparisonRow} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.comparisonFeature}>{row.feature}</Text>
                  <Text style={styles.comparisonCell}>{row.free}</Text>
                  <Text style={styles.comparisonCell}>{row.pro}</Text>
                  <Text style={styles.comparisonCell}>{row.business}</Text>
                </View>
              ))}
            </View>
          </View>
          ) : null}

          {activeTab === 'mypage' ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <View lightColor="transparent" darkColor="transparent">
                <Text style={styles.panelTitle}>マイページ</Text>
                <Text style={styles.panelMeta}>アカウント情報、現在プラン、Stripe決済ページを確認できます。</Text>
              </View>
            </View>
            <View style={styles.profileList}>
              <ProfileRow label="メールアドレス" value={currentUser?.email ?? '未ログイン'} />
              <ProfileRow label="登録日" value={currentUser?.created_at ? currentUser.created_at.slice(0, 10) : '未ログイン'} />
              <ProfileRow label="現在プラン" value={getPlanLabel(profile?.plan ?? usageSummary?.plan)} />
            </View>
            <View style={styles.upgradeBox}>
              <Text style={styles.rowTitle}>Stripe管理リンク</Text>
              <Text style={styles.rowSub}>現在はStripe Payment Linkに接続しています。プラン変更や有料登録に利用します。</Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => handleOpenBilling(profile?.plan === 'business' ? 'business' : 'pro')}>
                <Text style={styles.primaryButtonText} lightColor="#ffffff" darkColor="#ffffff">
                  Stripe決済ページを開く
                </Text>
              </Pressable>
            </View>
            <AuthPanel />
          </View>
          ) : null}

          {activeTab === 'supabase' ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <View lightColor="transparent" darkColor="transparent">
                <Text style={styles.panelTitle}>Supabase導入準備</Text>
                <Text style={styles.panelMeta}>DB接続前のデータ構造設計と型定義です。</Text>
              </View>
            </View>
            {supabaseTableDefinitions.map((table) => (
              <View key={table.name} style={styles.schemaCard}>
                <Text style={styles.schemaTitle}>{table.name}</Text>
                <Text style={styles.rowSub}>{table.purpose}</Text>
                {table.columns.map((column) => (
                  <View key={column.name} style={styles.schemaRow} lightColor="transparent" darkColor="transparent">
                    <Text style={styles.schemaColumn}>{column.name}</Text>
                    <Text style={styles.schemaType}>{column.type}</Text>
                    <Text style={styles.schemaNote}>{column.note}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.segmentButton, active ? styles.segmentButtonActive : undefined]} onPress={onPress}>
      <Text style={[styles.segmentText, active ? styles.segmentTextActive : undefined]}>{label}</Text>
    </Pressable>
  );
}

function MetricCard({ label, note, value }: { label: string; note: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricNote}>{note}</Text>
    </View>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileRow} lightColor="transparent" darkColor="transparent">
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
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
  header: {
    gap: 6,
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
  syncStatus: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  segmented: {
    backgroundColor: '#e9eef6',
    borderRadius: 8,
    gap: 6,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 6,
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#ffffff',
  },
  segmentText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#111827',
  },
  panel: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#ffffff',
    gap: 14,
  },
  panelHeader: {
    gap: 10,
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
  metricGrid: {
    gap: 10,
  },
  metricCard: {
    borderWidth: 1,
    borderColor: '#eef2f7',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
    gap: 5,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  metricValue: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  metricNote: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
  },
  upgradeBox: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#eff6ff',
    gap: 9,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d8dee8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },
  customerRow: {
    borderWidth: 1,
    borderColor: '#eef2f7',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
    gap: 6,
  },
  activeRow: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  rowBody: {
    gap: 3,
  },
  rowTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  rowSub: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
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
    minHeight: 84,
    textAlignVertical: 'top',
  },
  historyCard: {
    borderWidth: 1,
    borderColor: '#eef2f7',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
    gap: 10,
  },
  historyFooter: {
    alignItems: 'flex-start',
    gap: 8,
  },
  planCard: {
    borderWidth: 1,
    borderColor: '#eef2f7',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
    gap: 9,
  },
  planPrice: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  planFeature: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  comparisonTable: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  comparisonHeader: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  comparisonRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  comparisonFeature: {
    color: '#111827',
    flex: 1.25,
    fontSize: 12,
    fontWeight: '800',
  },
  comparisonCell: {
    color: '#475569',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  profileList: {
    borderWidth: 1,
    borderColor: '#eef2f7',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  profileRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
    gap: 4,
    padding: 12,
  },
  profileLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  profileValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  schemaCard: {
    borderWidth: 1,
    borderColor: '#eef2f7',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
    gap: 10,
  },
  schemaTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  schemaRow: {
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    gap: 3,
    paddingTop: 8,
  },
  schemaColumn: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  schemaType: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  schemaNote: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
  },
});
