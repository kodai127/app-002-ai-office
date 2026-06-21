import { ScrollView, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { SeoHead } from '@/components/SeoHead';
import { Text, View } from '@/components/Themed';
import { mockCustomers } from '@/lib/officeData';

export default function CustomersScreen() {
  return (
    <>
      <SeoHead
        title="顧客管理"
        description="フリーランス案件の顧客情報を管理し、見積・請求・入金確認へつなげます。"
        path="/customers"
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <AppHeader />
        <View style={styles.content} lightColor="transparent" darkColor="transparent">
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Customers</Text>
            <Text style={styles.title}>顧客を起点に案件・見積・請求を管理</Text>
            <Text style={styles.description}>
              連絡先、住所、メモを残し、案件ごとの見積作成や請求管理へつなげます。
            </Text>
            <Link href="/settings?tab=customers" style={styles.primaryLink}>
              顧客を編集する
            </Link>
          </View>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>顧客一覧</Text>
            {mockCustomers.map((customer) => (
              <View key={customer.id} style={styles.customerCard}>
                <Text style={styles.customerName}>{customer.name}</Text>
                <Text style={styles.customerMeta}>
                  {customer.contactName} / {customer.email}
                </Text>
                <Text style={styles.customerMemo}>{customer.memo}</Text>
                <Link
                  href={{
                    pathname: '/projects' as never,
                  }}
                  style={styles.secondaryLink}>
                  案件を確認
                </Link>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    gap: 12,
  },
  hero: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 12,
    padding: 18,
  },
  eyebrow: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#0f172a',
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 35,
  },
  description: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
  },
  primaryLink: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
  },
  panel: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 12,
    padding: 16,
  },
  panelTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  customerCard: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 7,
    padding: 14,
  },
  customerName: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
  },
  customerMeta: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },
  customerMemo: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  secondaryLink: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: 'center',
  },
});
