import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Link } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { SeoHead } from '@/components/SeoHead';
import { Text, View } from '@/components/Themed';
import { Customer } from '@/lib/officeData';
import {
  createCustomerDraft,
  deleteCustomerRecord,
  fetchCustomers,
  formatSupabaseError,
  upsertCustomer,
} from '@/lib/supabaseRepositories';

const initialForm = {
  contactName: '',
  email: '',
  id: '',
  memo: '',
  name: '',
  phone: '',
};

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    setStatusMessage('顧客を読み込んでいます...');

    try {
      const nextCustomers = await fetchCustomers();
      setCustomers(nextCustomers);
      setStatusMessage(nextCustomers.length > 0 ? 'Supabaseから顧客を読み込みました。' : 'まだ顧客はありません。');
    } catch (error) {
      const message = formatSupabaseError(error);
      console.error('顧客読み込みエラー', error);
      setStatusMessage(`顧客の読み込みに失敗しました。${message}`);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
  };

  const handleSaveCustomer = async () => {
    if (!form.name.trim()) {
      setStatusMessage('会社名を入力してください。');
      return;
    }

    setIsSaving(true);
    setStatusMessage(form.id ? '顧客を更新しています...' : '顧客を保存しています...');

    const today = new Date().toISOString().slice(0, 10);
    const payload: Customer = {
      address: '',
      contactName: form.contactName,
      createdAt: today,
      email: form.email,
      id: form.id || createCustomerDraft(customers.length + 1).id,
      memo: form.memo,
      name: form.name,
      phone: form.phone,
      updatedAt: today,
    };

    console.error('顧客保存payload', payload);

    try {
      const savedCustomer = await upsertCustomer(payload);
      setCustomers((currentCustomers) => {
        const exists = currentCustomers.some((customer) => customer.id === savedCustomer.id);

        if (exists) {
          return currentCustomers.map((customer) => (customer.id === savedCustomer.id ? savedCustomer : customer));
        }

        return [savedCustomer, ...currentCustomers];
      });
      resetForm();
      setStatusMessage(`顧客を保存しました。ID: ${savedCustomer.id}`);
    } catch (error) {
      const message = formatSupabaseError(error);
      console.error('顧客保存エラー', {
        error,
        payload,
      });
      setStatusMessage(`顧客の保存に失敗しました。${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setForm({
      contactName: customer.contactName,
      email: customer.email,
      id: customer.id,
      memo: customer.memo,
      name: customer.name,
      phone: customer.phone,
    });
    setStatusMessage('顧客情報をフォームに読み込みました。編集後に保存してください。');
  };

  const handleDeleteCustomer = async () => {
    if (!deleteTarget) {
      return;
    }

    setStatusMessage('顧客を削除しています...');

    try {
      await deleteCustomerRecord(deleteTarget.id);
      setCustomers((currentCustomers) => currentCustomers.filter((customer) => customer.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (form.id === deleteTarget.id) {
        resetForm();
      }
      setStatusMessage('顧客を削除しました。');
    } catch (error) {
      const message = formatSupabaseError(error);
      console.error('顧客削除エラー', {
        deleteTarget,
        error,
      });
      setStatusMessage(`顧客の削除に失敗しました。${message}`);
    }
  };

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
              会社名、担当者、連絡先、メモを保存し、案件作成時に顧客を選択できます。
            </Text>
            <Text style={styles.statusMessage}>{statusMessage}</Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>{form.id ? '顧客編集' : '顧客追加'}</Text>
              <Text style={styles.panelMeta}>保存後、案件作成画面の顧客選択に反映されます。</Text>
            </View>
            <Field label="会社名" value={form.name} onChangeText={(value) => setForm({ ...form, name: value })} placeholder="株式会社サンプル" />
            <Field
              label="担当者名"
              value={form.contactName}
              onChangeText={(value) => setForm({ ...form, contactName: value })}
              placeholder="山田 太郎"
            />
            <Field
              label="メール"
              value={form.email}
              onChangeText={(value) => setForm({ ...form, email: value })}
              placeholder="client@example.com"
              keyboardType="email-address"
            />
            <Field
              label="電話番号"
              value={form.phone}
              onChangeText={(value) => setForm({ ...form, phone: value })}
              placeholder="03-1234-5678"
              keyboardType="phone-pad"
            />
            <Field
              label="メモ"
              value={form.memo}
              onChangeText={(value) => setForm({ ...form, memo: value })}
              placeholder="支払条件、案件メモ、連絡時の注意点"
              multiline
            />
            <Pressable style={styles.primaryButton} onPress={handleSaveCustomer} disabled={isSaving}>
              <Text style={styles.primaryButtonText}>{isSaving ? '保存中...' : form.id ? '顧客を更新' : '顧客を保存'}</Text>
            </Pressable>
            {form.id ? (
              <Pressable style={styles.secondaryButton} onPress={resetForm}>
                <Text style={styles.secondaryButtonText}>編集をキャンセル</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.panelTitle}>顧客一覧</Text>
              <Text style={styles.panelMeta}>{customers.length}件の顧客を管理中</Text>
            </View>
            {customers.length > 0 ? (
              customers.map((customer) => (
                <View key={customer.id} style={styles.customerCard}>
                  <Text style={styles.customerName} numberOfLines={2} ellipsizeMode="tail">
                    {customer.name}
                  </Text>
                  <Text style={styles.customerMeta}>
                    {customer.contactName || '担当者未設定'} / {customer.email || 'メール未設定'}
                  </Text>
                  <Text style={styles.customerMeta}>{customer.phone || '電話番号未設定'}</Text>
                  <Text style={styles.customerMemo}>{customer.memo || 'メモなし'}</Text>
                  <View style={styles.actionGrid} lightColor="transparent" darkColor="transparent">
                    <Link
                      href={{
                        pathname: '/projects' as never,
                        params: {
                          customerId: customer.id,
                          customerName: customer.name,
                        },
                      }}
                      style={styles.primaryLinkSmall}>
                      この顧客で案件作成
                    </Link>
                    <View style={styles.cardActionRow} lightColor="transparent" darkColor="transparent">
                      <Pressable style={styles.secondaryButtonHalf} onPress={() => handleEditCustomer(customer)}>
                        <Text style={styles.secondaryButtonText}>編集</Text>
                      </Pressable>
                      <Pressable style={styles.deleteButtonHalf} onPress={() => setDeleteTarget(customer)}>
                        <Text style={styles.deleteButtonText}>削除</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>{isLoading ? '読み込み中...' : '保存済み顧客はありません。'}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={Boolean(deleteTarget)} animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.panelTitle}>顧客を削除しますか？</Text>
            <Text style={styles.panelMeta}>{deleteTarget?.name} は削除後に元に戻せません。</Text>
            <Pressable style={styles.dangerButton} onPress={handleDeleteCustomer}>
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
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
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
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
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
  customerCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 8,
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
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '800',
  },
  actionGrid: {
    gap: 8,
  },
  primaryLinkSmall: {
    overflow: 'hidden',
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlign: 'center',
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonHalf: {
    alignItems: 'center',
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  deleteButtonHalf: {
    alignItems: 'center',
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    backgroundColor: '#fff1f2',
    paddingHorizontal: 14,
    paddingVertical: 14,
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
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
});
