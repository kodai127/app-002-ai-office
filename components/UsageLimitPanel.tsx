import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { billingPlans, openBillingLink } from '@/lib/billing';
import { fetchUsageSummary, UsageSummary } from '@/lib/supabaseRepositories';
import { Text, View } from './Themed';

type UsageLimitPanelProps = {
  refreshKey?: number | string;
};

function getUsageLabel(summary: UsageSummary | null) {
  if (!summary) {
    return '利用状況を確認中...';
  }

  if (summary.limit === null) {
    return `${summary.used} / 無制限`;
  }

  return `${summary.used} / ${summary.limit}`;
}

function getRemainingLabel(summary: UsageSummary | null) {
  if (!summary) {
    return '月3回まで無料';
  }

  if (summary.limit === null) {
    return 'Pro/Businessは無制限で利用できます。';
  }

  if ((summary.remaining ?? 0) <= 0) {
    return '残り0回。Freeの今月分は上限に達しました。';
  }

  if (!summary.isLoggedIn) {
    return `残り${summary.remaining ?? 0}回（ログインすると今月の利用回数を管理できます）`;
  }

  return `残り${summary.remaining ?? 0}回`;
}

export function UsageLimitPanel({ refreshKey }: UsageLimitPanelProps) {
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const proPlan = billingPlans.find((plan) => plan.key === 'pro');
  const isFree = summary?.limit !== null;
  const isLocked = isFree && summary ? (summary.remaining ?? 0) <= 0 : false;

  useEffect(() => {
    let isMounted = true;

    async function loadUsage() {
      try {
        const usageSummary = await fetchUsageSummary();

        if (isMounted) {
          setSummary(usageSummary);
          setStatus('');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '利用状況を取得できませんでした。';

        if (isMounted) {
          setStatus(message);
        }
      }
    }

    loadUsage();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleUpgrade = async () => {
    if (!proPlan) {
      return;
    }

    setStatus('Proの決済ページを開いています...');

    try {
      await openBillingLink(proPlan);
      setStatus('Proの決済ページを開きました。');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Proの決済ページを開けませんでした。';
      setStatus(message);
    }
  };

  return (
    <View style={[styles.panel, isLocked ? styles.lockedPanel : undefined]}>
      <View style={styles.header} lightColor="transparent" darkColor="transparent">
        <View lightColor="transparent" darkColor="transparent">
          <Text style={styles.title}>今月利用</Text>
          <Text style={styles.usage}>{getUsageLabel(summary)}</Text>
        </View>
        <Text style={styles.badge}>
          {summary?.plan === 'business' ? 'Business' : summary?.plan === 'pro' ? 'Pro' : 'Free'}
        </Text>
      </View>
      {isFree ? <Text style={styles.freeLimit}>月3回まで無料</Text> : null}
      <Text style={styles.description}>{getRemainingLabel(summary)}</Text>
      {isLocked ? (
        <Text style={styles.lockedText}>
          今月の無料利用枠を使い切りました。Proにすると見積書・請求書を無制限で作成できます。
        </Text>
      ) : null}
      {isFree ? (
        <Pressable style={styles.upgradeButton} onPress={handleUpgrade}>
          <Text style={styles.upgradeButtonText} lightColor="#ffffff" darkColor="#ffffff">
            Proで無制限利用
          </Text>
        </Pressable>
      ) : null}
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#eff6ff',
    gap: 10,
  },
  lockedPanel: {
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
  },
  header: {
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    color: '#1e3a8a',
    fontSize: 13,
    fontWeight: '800',
  },
  usage: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },
  badge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#ffffff',
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  description: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '800',
  },
  freeLimit: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '900',
  },
  lockedText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  upgradeButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  status: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
});
