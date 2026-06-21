import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { SeoHead } from '@/components/SeoHead';
import { Text, View } from '@/components/Themed';
import { getCurrentUser } from '@/lib/auth';
import { Customer, formatCurrency, getProjectStatusLabel, isOverdue, ProjectRecord, ProjectStatus } from '@/lib/officeData';
import {
  deleteProjectRecord,
  fetchCustomers,
  fetchProjectRecords,
  formatSupabaseError,
  summarizeProjects,
  updateProjectStatus,
  upsertProject,
} from '@/lib/supabaseRepositories';

const statusColors: Record<ProjectStatus, { backgroundColor: string; color: string; borderColor: string }> = {
  draft: {
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

const initialForm = {
  amount: '',
  customerId: '',
  customerName: '',
  dueDate: new Date().toISOString().slice(0, 10),
  id: '',
  memo: '',
  name: '',
  status: 'draft' as ProjectStatus,
};

export default function ProjectsScreen() {
  const params = useLocalSearchParams<{ customerId?: string; customerName?: string }>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRecord | null>(null);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastPayload, setLastPayload] = useState('');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [userId, setUserId] = useState('');
  const summary = useMemo(() => summarizeProjects(projects), [projects]);
  const unpaidProjects = useMemo(() => projects.filter((project) => project.status === 'invoiced'), [projects]);

  useEffect(() => {
    getCurrentUser().then((currentUser) => {
      setUserId(currentUser?.id ?? '');
    });
    loadProjects();
  }, []);

  useEffect(() => {
    const customerId = typeof params.customerId === 'string' ? params.customerId : '';
    const customerName = typeof params.customerName === 'string' ? params.customerName : '';

    if (!customerId && !customerName) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      customerId,
      customerName,
    }));
    setStatusMessage(customerName ? `${customerName} の案件作成を開始できます。` : '顧客を選択した状態で案件作成を開始できます。');
  }, [params.customerId, params.customerName]);

  const loadProjects = async () => {
    setIsLoading(true);
    setStatusMessage('案件を読み込んでいます...');

    try {
      const [currentUser, nextCustomers, nextProjects] = await Promise.all([
        getCurrentUser(),
        fetchCustomers(),
        fetchProjectRecords(),
      ]);
      setUserId(currentUser?.id ?? '');
      setCustomers(nextCustomers);
      setProjects(nextProjects);
      setForm((currentForm) => ({
        ...currentForm,
        customerId: currentForm.customerId || nextCustomers[0]?.id || '',
        customerName: currentForm.customerName || nextCustomers[0]?.name || '',
      }));
      setStatusMessage(nextProjects.length > 0 ? 'Supabaseから案件を読み込みました。' : 'まだ案件はありません。');
    } catch (error) {
      const message = formatSupabaseError(error);
      console.error('案件読み込みエラー', error);
      setStatusMessage(`案件の読み込みに失敗しました。${message}`);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      ...initialForm,
      customerId: customers[0]?.id ?? '',
      customerName: customers[0]?.name ?? '',
    });
  };

  const handleSaveProject = async () => {
    const amount = Number(form.amount);

    if (!form.name.trim()) {
      setStatusMessage('案件名を入力してください。');
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      setStatusMessage('金額は0以上の数値で入力してください。');
      return;
    }

    if (!form.dueDate.trim()) {
      setStatusMessage('支払期限を入力してください。');
      return;
    }

    setIsSaving(true);
    setStatusMessage(form.id ? '案件を更新しています...' : '案件を保存しています...');
    const diagnosticPayload = {
      amount,
      customerId: form.customerId || null,
      customerName: form.customerName || '顧客未設定',
      dueDate: form.dueDate,
      id: form.id || 'new',
      memo: form.memo || null,
      name: form.name,
      status: form.status,
      userId,
    };
    setLastPayload(JSON.stringify(diagnosticPayload));
    console.error('案件保存payload', diagnosticPayload);

    try {
      const savedProject = await upsertProject({
        amount,
        customerId: form.customerId,
        customerName: form.customerName,
        dueDate: form.dueDate,
        id: form.id || undefined,
        memo: form.memo,
        name: form.name,
        status: form.status,
      });

      setProjects((currentProjects) => {
        const exists = currentProjects.some((project) => project.id === savedProject.id);

        if (exists) {
          return currentProjects.map((project) => (project.id === savedProject.id ? savedProject : project));
        }

        return [savedProject, ...currentProjects];
      });
      resetForm();
      setStatusMessage(`案件を保存しました。ID: ${savedProject.id}`);
    } catch (error) {
      const message = formatSupabaseError(error);
      console.error('案件保存エラー', {
        error,
        form,
      });
      setStatusMessage(`案件の保存に失敗しました。${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProject = (project: ProjectRecord) => {
    setForm({
      amount: String(project.amount),
      customerId: project.customerId,
      customerName: project.customerName,
      dueDate: project.dueDate,
      id: project.id,
      memo: project.memo,
      name: project.name,
      status: project.status,
    });
    setStatusMessage('案件詳細をフォームに読み込みました。編集後に保存してください。');
  };

  const handleMarkAsPaid = async (projectId: string) => {
    setStatusMessage('入金済みに更新しています...');

    try {
      const updatedProject = await updateProjectStatus(projectId, 'paid');
      setProjects((currentProjects) =>
        currentProjects.map((project) => (project.id === updatedProject.id ? updatedProject : project))
      );
      setStatusMessage('案件を入金済みにしました。');
    } catch (error) {
      const message = formatSupabaseError(error);
      console.error('案件ステータス更新エラー', {
        error,
        projectId,
      });
      setStatusMessage(`入金済みへの更新に失敗しました。${message}`);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget) {
      return;
    }

    setStatusMessage('案件を削除しています...');

    try {
      await deleteProjectRecord(deleteTarget.id);
      setProjects((currentProjects) => currentProjects.filter((project) => project.id !== deleteTarget.id));
      setDeleteTarget(null);
      setStatusMessage('案件を削除しました。');
    } catch (error) {
      const message = formatSupabaseError(error);
      console.error('案件削除エラー', {
        deleteTarget,
        error,
      });
      setStatusMessage(`案件の削除に失敗しました。${message}`);
    }
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
              Web制作、動画編集、AI開発、デザイン、ライター案件の見積・請求・未入金をSupabaseに保存します。
            </Text>
            <Text style={styles.statusMessage}>{statusMessage}</Text>
            <Text style={styles.diagnosticText}>ログインuser_id: {userId || '未ログイン'}</Text>
            {lastPayload ? <Text style={styles.diagnosticText}>保存payload: {lastPayload}</Text> : null}
          </View>

          <View style={styles.metricGrid} lightColor="transparent" darkColor="transparent">
            <MetricCard label="今月売上" value={formatCurrency(summary.monthlyRevenue)} />
            <MetricCard
              label="未入金額"
              value={formatCurrency(summary.outstandingAmount)}
              danger={summary.outstandingAmount > 0}
            />
            <MetricCard label="進行中案件" value={`${summary.activeCount}件`} />
            <MetricCard label="請求済み" value={`${summary.invoicedCount}件`} />
            <MetricCard label="入金済み" value={`${summary.paidCount}件`} />
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>{form.id ? '案件編集' : '案件追加'}</Text>
              <Text style={styles.panelMeta}>ログインユーザー本人のprojectsテーブルに保存します。</Text>
            </View>
            <Field label="案件名" value={form.name} onChangeText={(value) => setForm({ ...form, name: value })} placeholder="LP制作" />
            <Text style={styles.label}>顧客</Text>
            <View style={styles.customerPicker} lightColor="transparent" darkColor="transparent">
              {customers.length > 0 ? (
                customers.map((customer) => (
                  <Pressable
                    key={customer.id}
                    style={[styles.customerChip, form.customerId === customer.id ? styles.customerChipActive : undefined]}
                    onPress={() => setForm({ ...form, customerId: customer.id, customerName: customer.name })}>
                    <Text style={[styles.customerChipText, form.customerId === customer.id ? styles.customerChipTextActive : undefined]}>
                      {customer.name}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyText}>顧客が未登録です。顧客なしでも案件保存できます。</Text>
              )}
            </View>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => setForm({ ...form, customerId: '', customerName: '' })}>
              <Text style={styles.secondaryButtonText}>顧客選択を解除</Text>
            </Pressable>
            <Field
              label="顧客名"
              value={form.customerName}
              onChangeText={(value) => setForm({ ...form, customerId: '', customerName: value })}
              placeholder="株式会社サンプル / 個人名"
            />
            <Field
              label="金額"
              value={form.amount}
              onChangeText={(value) => setForm({ ...form, amount: value })}
              placeholder="200000"
              keyboardType="number-pad"
            />
            <Field
              label="メモ"
              value={form.memo}
              onChangeText={(value) => setForm({ ...form, memo: value })}
              placeholder="提案内容、作業範囲、確認事項"
              multiline
            />
            <Field
              label="支払期限"
              value={form.dueDate}
              onChangeText={(value) => setForm({ ...form, dueDate: value })}
              placeholder="2026-07-31"
            />
            <Text style={styles.label}>ステータス</Text>
            <View style={styles.statusPicker} lightColor="transparent" darkColor="transparent">
              {(['draft', 'estimated', 'invoiced', 'paid'] as ProjectStatus[]).map((status) => (
                <Pressable
                  key={status}
                  style={[styles.statusOption, form.status === status ? styles.statusOptionActive : undefined]}
                  onPress={() => setForm({ ...form, status })}>
                  <Text style={[styles.statusOptionText, form.status === status ? styles.statusOptionTextActive : undefined]}>
                    {getProjectStatusLabel(status)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.primaryButton} onPress={handleSaveProject} disabled={isSaving}>
              <Text style={styles.primaryButtonText}>{isSaving ? '保存中...' : form.id ? '案件を更新' : '案件を保存'}</Text>
            </Pressable>
            {form.id ? (
              <Pressable style={styles.secondaryButton} onPress={resetForm}>
                <Text style={styles.secondaryButtonText}>編集をキャンセル</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.panel, styles.unpaidPanel]}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>未入金管理</Text>
              <Text style={styles.panelMeta}>期限超過と未入金額をすぐ確認できます。</Text>
            </View>
            {unpaidProjects.length > 0 ? (
              unpaidProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={setDeleteTarget}
                  onEdit={handleEditProject}
                  onMarkAsPaid={handleMarkAsPaid}
                  showPaymentAction
                />
              ))
            ) : (
              <Text style={styles.emptyText}>{isLoading ? '読み込み中...' : '未入金の案件はありません。'}</Text>
            )}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>案件一覧</Text>
              <Text style={styles.panelMeta}>案件カードから見積書作成、請求書作成、編集、削除へ進めます。</Text>
            </View>
            {projects.length > 0 ? (
              projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={setDeleteTarget}
                  onEdit={handleEditProject}
                  onMarkAsPaid={handleMarkAsPaid}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>{isLoading ? '読み込み中...' : '保存済み案件はありません。'}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={Boolean(deleteTarget)} animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.panelTitle}>案件を削除しますか？</Text>
            <Text style={styles.panelMeta}>{deleteTarget?.name} は削除後に元に戻せません。</Text>
            <Pressable style={styles.dangerButton} onPress={handleDeleteProject}>
              <Text style={styles.primaryButtonText}>削除する</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setDeleteTarget(null)}>
              <Text style={styles.secondaryButtonText}>キャンセル</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Field({
  keyboardType = 'default',
  label,
  multiline,
  onChangeText,
  placeholder,
  value,
}: {
  keyboardType?: 'default' | 'number-pad';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
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

function MetricCard({ danger, label, value }: { danger?: boolean; label: string; value: string }) {
  return (
    <View style={[styles.metricCard, danger ? styles.dangerMetric : undefined]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, danger ? styles.dangerText : undefined]}>{value}</Text>
    </View>
  );
}

function ProjectCard({
  onDelete,
  onEdit,
  onMarkAsPaid,
  project,
  showPaymentAction,
}: {
  onDelete: (project: ProjectRecord) => void;
  onEdit: (project: ProjectRecord) => void;
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
      <Text style={styles.memo}>{project.memo || 'メモなし'}</Text>
      <View style={styles.actionGrid} lightColor="transparent" darkColor="transparent">
        <Link href={`/projects/${project.id}` as never} style={styles.detailLink}>
          案件詳細を見る
        </Link>
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
        <View style={styles.cardActionRow} lightColor="transparent" darkColor="transparent">
          <Pressable style={styles.secondaryButtonHalf} onPress={() => onEdit(project)}>
            <Text style={styles.secondaryButtonText}>編集</Text>
          </Pressable>
          <Pressable style={styles.deleteButtonHalf} onPress={() => onDelete(project)}>
            <Text style={styles.deleteButtonText}>削除</Text>
          </Pressable>
        </View>
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
  statusMessage: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  diagnosticText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
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
  field: {
    gap: 6,
  },
  label: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '800',
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
    minHeight: 90,
    textAlignVertical: 'top',
  },
  customerPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  customerChip: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customerChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  customerChipText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '900',
  },
  customerChipTextActive: {
    color: '#ffffff',
  },
  statusPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  statusOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  statusOptionText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '900',
  },
  statusOptionTextActive: {
    color: '#2563eb',
  },
  primaryButton: {
    alignItems: 'center',
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
  secondaryButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '900',
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
  detailLink: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 13,
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
  cardActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonHalf: {
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deleteButtonHalf: {
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    backgroundColor: '#fff1f2',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 12,
    padding: 18,
  },
  dangerButton: {
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
});
