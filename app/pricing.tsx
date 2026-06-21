import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { SeoHead } from '@/components/SeoHead';
import { Text, View } from '@/components/Themed';
import { billingPlans, openBillingLink } from '@/lib/billing';

const comparisonRows = [
  { feature: '月間作成件数', free: '3件まで', pro: '無制限', business: '無制限' },
  { feature: '案件管理', free: '3件まで', pro: '無制限', business: '無制限' },
  { feature: '顧客管理', free: '体験', pro: '対応', business: '対応' },
  { feature: '見積・請求作成', free: '対応', pro: '対応', business: '対応' },
  { feature: 'PDF出力', free: '対応', pro: '対応', business: '対応' },
  { feature: 'おすすめ対象', free: '試用', pro: '個人事業主', business: '小規模チーム' },
];

export default function PricingScreen() {
  return (
    <>
      <SeoHead
        title="料金プラン"
        description="AI Officeの料金プラン。Freeは月3件まで、Proは月980円、Businessは月2,980円で案件、見積、請求、入金管理を利用できます。"
        path="/pricing"
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <AppHeader />
        <View style={styles.content} lightColor="transparent" darkColor="transparent">
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Pricing</Text>
            <Text style={styles.title}>まず無料で試して、必要になったらProへ。</Text>
            <Text style={styles.description}>
              フリーランスの案件、見積、請求、入金確認をまとめて管理できます。月3件までは無料です。
            </Text>
          </View>

          <View style={styles.planCards} lightColor="transparent" darkColor="transparent">
            {billingPlans.map((plan) => (
              <View key={plan.key} style={[styles.planCard, plan.key === 'pro' ? styles.recommendedPlan : undefined]}>
                <Text style={styles.planName}>{plan.title}</Text>
                <Text style={styles.planPrice}>月額{plan.monthlyPrice}</Text>
                <Text style={styles.planDescription}>{plan.description}</Text>
                <View style={styles.featureList} lightColor="transparent" darkColor="transparent">
                  {plan.features.map((feature) => (
                    <Text key={feature} style={styles.planFeature}>
                      ✓ {feature}
                    </Text>
                  ))}
                </View>
                {plan.paymentLink ? (
                  <Pressable style={styles.primaryButton} onPress={() => openBillingLink(plan)}>
                    <Text style={styles.primaryButtonText}>
                      {plan.key === 'pro' ? '980円で始める' : '2,980円で始める'}
                    </Text>
                  </Pressable>
                ) : (
                  <Link href={'/projects' as never} style={styles.secondaryLink}>
                    無料で試す
                  </Link>
                )}
              </View>
            ))}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>料金比較</Text>
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
    maxWidth: 760,
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
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 35,
  },
  description: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
  },
  planCards: {
    gap: 10,
  },
  planCard: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 10,
    padding: 16,
  },
  recommendedPlan: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  planName: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  planPrice: {
    color: '#0f172a',
    fontSize: 27,
    fontWeight: '900',
  },
  planDescription: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  featureList: {
    gap: 5,
  },
  planFeature: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
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
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryLink: {
    overflow: 'hidden',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#2563eb',
    fontSize: 15,
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
    flex: 1.25,
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 10,
  },
  comparisonCell: {
    flex: 1,
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
});
