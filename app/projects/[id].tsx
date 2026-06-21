import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { SeoHead } from '@/components/SeoHead';
import { Text, View } from '@/components/Themed';
import {
  formatCurrency,
  getProjectStatusLabel,
  isOverdue,
  ProjectRecord,
} from '@/lib/officeData';
import {
  fetchProjectRecords,
  formatSupabaseError,
  updateProjectStatus,
} from '@/lib/supabaseRepositories';

function getEstimateStatus(project: ProjectRecord) {
  return project.status === 'draft' ? '未作成' : '見積済み';
}

function getInvoiceStatus(project: ProjectRecord) {
  return project.status === 'invoiced' || project.status === 'paid' ? '請求済み' : '未請求';
}

function getPaymentStatus(project: ProjectRecord) {
  if (project.status === 'paid') {
    return '入金済み';
  }

  if (project.status === 'invoiced') {
    return '未入金';
  }

  return '請求前';
}

export default function ProjectDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const projectId = typeof params.id === 'string' ? params.id : '';
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState('案件詳細を読み込んでいます...');

  const overdue = useMemo(() => (project ? project.status === 'invoiced' && isOverdue(project.dueDate) : false), [project]);

  useEffect(() => {
    let isMounted = true;

    async function loadProject() {
      if (!projectId) {
        setStatusMessage('案件IDが見つかりません。');
        setIsLoading(false);
        return;
      }

      try {
        const projects = await fetchProjectRecords();
        const nextProject = projects.find((item) => item.id === projectId) ?? null;

        if (!isMounted) {
          return;
        }

        setProject(nextProject);
        setStatusMessage(nextProject ? '案件詳細を表示しています。' : '指定された案件が見つかりません。');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = formatSupabaseError(error);
        console.error('案件詳細読み込みエラー', {
          error,
          projectId,
        });
        setStatusMessage(`案件詳細の読み込みに失敗しました。${message}`);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const handleMarkAsPaid = async () => {
    if (!project) {
      return;
    }

    setStatusMessage('入金済みに更新しています...');

    try {
      const updatedProject = await updateProjectStatus(project.id, 'paid');
      setProject(updatedProject);
      setStatusMessage('入金済みに更新しました。');
    } catch (error) {
      const message = formatSupabaseError(error);
      console.error('案件詳細 入金済み更新エラー', {
        error,
        project,
      });
      setStatusMessage(`入金済みへの更新に失敗しました。${message}`);
    }
  };

  return (
    <>
      <SeoHead
        title={project ? `${project.name}の案件詳細` : '案件詳細'}
        description="AI Officeで案件の見積状況、請求状況、入金状況、期限を確認できます。"
        path={projectId ? `/projects/${projectId}` : '/projects'}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <AppHeader />
        <View style={styles.content} lightColor="transparent" darkColor="transparent">
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Project Detail</Text>
            <Text style={styles.title} numberOfLines={3} ellipsizeMode="tail">
              {project?.name ?? '案件詳細'}
            </Text>
            <Text style={styles.description}>
              案件単位で、顧客・金額・見積・請求・入金・期限を確認できます。
            </Text>
            <Text style={styles.statusMessage}>{statusMessage}</Text>
          </View>

          {project ? (
            <>
              <View style={[styles.panel, overdue ? styles.overduePanel : undefined]}>
                <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.panelTitle}>案件サマリー</Text>
                  <Text style={styles.panelMeta}>
                    {overdue ? '期限切れの未入金案件です。入金確認を優先してください。' : '案件の現在状態を確認できます。'}
                  </Text>
                </View>
                <View style={styles.metricGrid} lightColor="transparent" darkColor="transparent">
                  <DetailMetric label="顧客" value={project.customerName || '顧客未設定'} />
                  <DetailMetric label="金額" value={formatCurrency(project.amount)} />
                  <DetailMetric label="期限" value={`${project.dueDate}${overdue ? ' 期限超過' : ''}`} danger={overdue} />
                  <DetailMetric label="ステータス" value={getProjectStatusLabel(project.status)} />
                </View>
              </View>

              <View style={styles.panel}>
                <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.panelTitle}>進行状況</Text>
                  <Text style={styles.panelMeta}>見積、請求、入金までの状態です。</Text>
                </View>
                <StatusRow label="見積状況" value={getEstimateStatus(project)} />
                <StatusRow label="請求状況" value={getInvoiceStatus(project)} />
                <StatusRow label="入金状況" value={getPaymentStatus(project)} danger={project.status === 'invoiced'} />
              </View>

              <View style={styles.panel}>
                <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.panelTitle}>メモ</Text>
                </View>
                <Text style={styles.memo}>{project.memo || 'メモなし'}</Text>
              </View>

              <View style={styles.actionPanel}>
                <Link
                  href={{
                    pathname: '/estimate',
                    params: {
                      customerName: project.customerName,
                      hourlyRate: '8000',
                      hours: Math.max(Math.round(project.amount / 8000), 1).toString(),
                      projectName: project.name,
                      workDescription: project.memo,
                    },
                  }}
                  style={styles.secondaryLink}>
                  案件から見積書を作成
                </Link>
                <Link
                  href={{
                    pathname: '/invoice',
                    params: {
                      customerName: project.customerName,
                      dueDate: project.dueDate,
                      hourlyRate: '8000',
                      hours: Math.max(Math.round(project.amount / 8000), 1).toString(),
                      invoiceNumber: `INV-${project.id.replace('prj_', '')}`,
                      issueDate: new Date().toISOString().slice(0, 10),
                      projectName: project.name,
                      workDescription: project.memo,
                    },
                  }}
                  style={styles.primaryLink}>
                  請求書を作成
                </Link>
                {project.status === 'invoiced' ? (
                  <Pressable style={styles.paidButton} onPress={handleMarkAsPaid}>
                    <Text style={styles.paidButtonText}>入金済みにする</Text>
                  </Pressable>
                ) : null}
                <Link href={'/projects' as never} style={styles.backLink}>
                  案件一覧へ戻る
                </Link>
              </View>
            </>
          ) : (
            <View style={styles.panel}>
              <Text style={styles.panelMeta}>{isLoading ? '読み込み中...' : '案件一覧から再度選択してください。'}</Text>
              <Link href={'/projects' as never} style={styles.primaryLink}>
                案件一覧へ戻る
              </Link>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

function DetailMetric({ danger, label, value }: { danger?: boolean; label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, danger ? styles.dangerText : undefined]}>{value}</Text>
    </View>
  );
}

function StatusRow({ danger, label, value }: { danger?: boolean; label: string; value: string }) {
  return (
    <View style={styles.statusRow} lightColor="transparent" darkColor="transparent">
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, danger ? styles.dangerText : undefined]}>{value}</Text>
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
  statusMessage: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  panel: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 12,
    padding: 16,
  },
  overduePanel: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  panelHeader: {
    gap: 3,
  },
  panelTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  panelMeta: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexBasis: 150,
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 5,
    padding: 14,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '900',
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 24,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  statusLabel: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '900',
  },
  statusValue: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
  },
  memo: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
  },
  dangerText: {
    color: '#dc2626',
  },
  actionPanel: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 10,
    padding: 16,
  },
  primaryLink: {
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
  secondaryLink: {
    overflow: 'hidden',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '900',
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
  },
  paidButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  paidButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  backLink: {
    overflow: 'hidden',
    minHeight: 44,
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '900',
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: 'center',
  },
});
