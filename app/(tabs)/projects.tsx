import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { SeoHead } from '@/components/SeoHead';
import { Text, View } from '@/components/Themed';
import {
  formatCurrency,
  getProjectStatusLabel,
  isOverdue,
  isThisMonth,
  mockProjectRecords,
  ProjectRecord,
  ProjectStatus,
} from '@/lib/officeData';

const statusColors: Record<ProjectStatus, { backgroundColor: string; color: string; borderColor: string }> = {
  before_estimate: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    color: '#475569',
  },
  estimated: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    color: '#1d4ed8',
  },
  invoiced: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    color: '#c2410c',
  },
  paid: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    color: '#047857',
  },
};

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<ProjectRecord[]>(mockProjectRecords);
  const unpaidProjects = useMemo(() => projects.filter((project) => project.status === 'invoiced'), [projects]);
  const activeProjects = useMemo(() => projects.filter((project) => project.status !== 'paid'), [projects]);
  const paidThisMonth = useMemo(
    () => projects.filter((project) => project.status === 'paid' && isThisMonth(project.updatedAt)),
    [projects]
  );
  const outstandingAmount = unpaidProjects.reduce((total, project) => total + project.amount, 0);
  const monthlyRevenue = paidThisMonth.reduce((total, project) => total + project.amount, 0);

  const markAsPaid = (projectId: string) => {
    const today = new Date().toISOString().slice(0, 10);

    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              status: 'paid',
              updatedAt: today,
            }
          : project
      )
    );
  };

  return (
    <>
      <SeoHead
        title="案件管理"
        description="AI Officeは、フリーランスの案件、見積、請求、入金確認を1画面で管理するSaaSです。"
        path="/projects"
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <AppHeader />
        <View style={styles.content} lightColor="transparent" darkColor="transparent">
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Projects</Text>
            <Text style={styles.title}>案件から入金確認まで、1画面で管理</Text>
            <Text style={styles.description}>
              Web制作、動画編集、AI開発、デザイン、ライター案件の見積・請求・未入金をまとめて確認できます。
            </Text>
            <Link href="/estimate" style={styles.primaryLink}>
              新しい案件の見積を作成
            </Link>
          </View>

          <View style={styles.metricGrid} lightColor="transparent" darkColor="transparent">
            <MetricCard label="今月売上" value={formatCurrency(monthlyRevenue)} />
            <MetricCard label="未入金額" value={formatCurrency(outstandingAmount)} danger={outstandingAmount > 0} />
            <MetricCard label="進行中案件" value={`${activeProjects.length}件`} />
            <MetricCard label="請求済み" value={`${unpaidProjects.length}件`} />
            <MetricCard label="入金済み" value={`${projects.filter((project) => project.status === 'paid').length}件`} />
          </View>

          <View style={[styles.panel, styles.unpaidPanel]}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>未入金管理</Text>
              <Text style={styles.panelMeta}>期限超過と未入金額をすぐ確認できます。</Text>
            </View>
            {unpaidProjects.length > 0 ? (
              unpaidProjects.map((project) => (
                <ProjectCard key={project.id} project={project} onMarkAsPaid={markAsPaid} showPaymentAction />
              ))
            ) : (
              <Text style={styles.emptyText}>未入金の案件はありません。</Text>
            )}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>案件一覧</Text>
              <Text style={styles.panelMeta}>案件カードから見積書作成、請求書作成、入金済み変更へ進めます。</Text>
            </View>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onMarkAsPaid={markAsPaid} />
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function MetricCard({ danger, label, value }: { danger?: boolean; label: string; value: string }) {
  return (
    <View style={[styles.metricCard, danger ? styles.dangerMetric : undefined]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, danger ? styles.dangerText : undefined]}>{value}</Text>
    </View>
  );
}

function ProjectCard({
  onMarkAsPaid,
  project,
  showPaymentAction,
}: {
  onMarkAsPaid: (projectId: string) => void;
  project: ProjectRecord;
  showPaymentAction?: boolean;
}) {
  const overdue = project.status === 'invoiced' && isOverdue(project.dueDate);
  const statusColor = statusColors[project.status];

  return (
    <View style={[styles.projectCard, overdue ? styles.overdueCard : undefined]}>
      <View style={styles.projectTop} lightColor="transparent" darkColor="transparent">
        <View style={styles.projectTitleBlock} lightColor="transparent" darkColor="transparent">
          <Text style={styles.projectName}>{project.name}</Text>
          <Text style={styles.projectCustomer}>{project.customerName}</Text>
        </View>
        <Text
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusColor.backgroundColor,
              borderColor: statusColor.borderColor,
              color: statusColor.color,
            },
          ]}>
          {getProjectStatusLabel(project.status)}
        </Text>
      </View>
      <View style={styles.projectMetaGrid} lightColor="transparent" darkColor="transparent">
        <View style={styles.projectMeta} lightColor="transparent" darkColor="transparent">
          <Text style={styles.metaLabel}>金額</Text>
          <Text style={styles.metaValue}>{formatCurrency(project.amount)}</Text>
        </View>
        <View style={styles.projectMeta} lightColor="transparent" darkColor="transparent">
          <Text style={styles.metaLabel}>期限</Text>
          <Text style={[styles.metaValue, overdue ? styles.dangerText : undefined]}>
            {project.dueDate}
            {overdue ? ' 期限超過' : ''}
          </Text>
        </View>
      </View>
      <Text style={styles.memo}>{project.memo}</Text>
      <View style={styles.actionGrid} lightColor="transparent" darkColor="transparent">
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
          案件から見積
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
          style={styles.primaryLinkSmall}>
          請求書作成
        </Link>
        {project.status === 'invoiced' || showPaymentAction ? (
          <Pressable style={styles.paidButton} onPress={() => onMarkAsPaid(project.id)}>
            <Text style={styles.paidButtonText}>入金済みにする</Text>
          </Pressable>
        ) : null}
      </View>
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
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 2,
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
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexBasis: 150,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 6,
    padding: 14,
  },
  dangerMetric: {
    borderColor: '#fecaca',
    backgroundColor: '#fff7ed',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '900',
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
  },
  dangerText: {
    color: '#dc2626',
  },
  panel: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 12,
    padding: 16,
  },
  unpaidPanel: {
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
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '800',
  },
  projectCard: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 12,
    padding: 14,
  },
  overdueCard: {
    borderColor: '#fecaca',
  },
  projectTop: {
    alignItems: 'flex-start',
    gap: 8,
  },
  projectTitleBlock: {
    gap: 3,
  },
  projectName: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '900',
  },
  projectCustomer: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '800',
  },
  statusBadge: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  projectMetaGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  projectMeta: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 2,
    padding: 10,
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
  },
  metaValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '900',
  },
  memo: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
  },
  actionGrid: {
    gap: 8,
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
  primaryLinkSmall: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: 'center',
  },
  paidButton: {
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  paidButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
