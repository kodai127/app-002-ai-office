import { ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
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

export default function HomeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.content} lightColor="transparent" darkColor="transparent">
        <View style={styles.header} lightColor="transparent" darkColor="transparent">
          <Text style={styles.eyebrow}>Dashboard</Text>
          <Text style={styles.title}>業務ダッシュボード</Text>
          <Text style={styles.description}>見積、請求、顧客の状況をひと目で確認できます。</Text>
        </View>

        <View style={styles.kpiGrid} lightColor="transparent" darkColor="transparent">
          <KpiCard label="今月見積件数" value={`${monthlyEstimateCount}件`} trend="+2件 前月比" />
          <KpiCard label="今月請求額" value={formatCurrency(monthlyInvoiceAmount)} trend="入金予定を含む" />
          <KpiCard label="顧客数" value={`${mockCustomers.length}社`} trend="アクティブ顧客" />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
            <Text style={styles.panelTitle}>最近の見積</Text>
            <Text style={styles.panelMeta}>保存済みの見積履歴</Text>
          </View>
          {mockEstimateRecords.map((estimate) => (
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
            <Text style={styles.panelTitle}>請求サマリー</Text>
            <Text style={styles.panelMeta}>未入金と入金済みを確認</Text>
          </View>
          {mockInvoiceRecords.map((invoice) => (
            <View key={invoice.id} style={styles.listRow} lightColor="transparent" darkColor="transparent">
              <View style={styles.rowBody} lightColor="transparent" darkColor="transparent">
                <Text style={styles.rowTitle}>{invoice.invoiceNumber}</Text>
                <Text style={styles.rowSub}>{invoice.customerName}</Text>
              </View>
              <View style={styles.rowSide} lightColor="transparent" darkColor="transparent">
                <Text style={styles.rowAmount}>{formatCurrency(invoice.amount)}</Text>
                <Text style={styles.status}>{invoiceStatusLabel(invoice.status)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
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
  },
  listRow: {
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    gap: 8,
    paddingTop: 12,
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
});
