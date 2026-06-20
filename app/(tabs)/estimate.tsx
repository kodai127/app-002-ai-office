import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Text, View } from '@/components/Themed';
import { saveEstimateRecord } from '@/lib/supabaseRepositories';

const numberFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 2,
});

const manYenUnit = 10000;
const storageKey = 'ai-office-estimate-form';
const invoiceDraftStorageKey = 'ai-office-invoice-draft';
const hourlyRateLabel = '時給';

type EstimateFormState = {
  customerName: string;
  projectName: string;
  workDescription: string;
  hours: string;
  hourlyRate: string;
};

type BrowserStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type PrintWindow = {
  document: {
    close: () => void;
    open: () => void;
    write: (html: string) => void;
  };
  focus: () => void;
  print: () => void;
};

type BrowserPrintGlobal = typeof globalThis & {
  open?: (url?: string, target?: string) => PrintWindow | null;
};

function getBrowserStorage() {
  const browserGlobal = globalThis as typeof globalThis & {
    localStorage?: BrowserStorage;
  };

  return browserGlobal.localStorage ?? null;
}

function parseAmount(value: string) {
  const normalizedValue = value
    .replace(/[０-９]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
    .replace(/[^\d.-]/g, '')
    .trim();
  const amount = Number(normalizedValue);

  return Number.isFinite(amount) ? amount : 0;
}

function calculateEstimateAmount(hours: number, hourlyRate: number) {
  return hours * hourlyRate;
}

function formatYen(amount: number) {
  return `${numberFormatter.format(amount)}円`;
}

function formatEstimateTotal(amount: number) {
  if (amount >= manYenUnit && Number.isInteger(amount) && amount % manYenUnit === 0) {
    return `${numberFormatter.format(amount / manYenUnit)}万円`;
  }

  return formatYen(amount);
}

function formatDateForFileName(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />');
}

function buildEstimatePdfHtml({
  customerName,
  estimateAmount,
  fileName,
  hourlyRate,
  hours,
  projectName,
  workDescription,
}: EstimateFormState & {
  estimateAmount: number;
  fileName: string;
}) {
  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(fileName)}</title>
    <style>
      @page {
        margin: 24mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        color: #111827;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
        line-height: 1.7;
      }
      .document {
        width: 100%;
      }
      .header {
        align-items: flex-start;
        border-bottom: 2px solid #111827;
        display: flex;
        justify-content: space-between;
        padding-bottom: 18px;
      }
      h1 {
        font-size: 28px;
        letter-spacing: 0.08em;
        margin: 0;
      }
      .date {
        color: #4b5563;
        font-size: 12px;
        text-align: right;
      }
      .section {
        margin-top: 28px;
      }
      .customer {
        border-bottom: 1px solid #9ca3af;
        display: inline-block;
        font-size: 18px;
        font-weight: 700;
        min-width: 280px;
        padding-bottom: 6px;
      }
      .total {
        background: #f8fafc;
        border: 1px solid #dbe3ef;
        border-radius: 6px;
        margin-top: 24px;
        padding: 18px 20px;
      }
      .total-label {
        color: #475569;
        font-size: 12px;
        font-weight: 700;
      }
      .total-amount {
        font-size: 30px;
        font-weight: 800;
        margin-top: 4px;
      }
      table {
        border-collapse: collapse;
        margin-top: 12px;
        width: 100%;
      }
      th,
      td {
        border: 1px solid #d1d5db;
        padding: 10px 12px;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #f3f4f6;
        color: #374151;
        font-weight: 700;
        width: 28%;
      }
      .formula {
        color: #475569;
        font-weight: 700;
        margin-top: 10px;
      }
    </style>
  </head>
  <body>
    <main class="document">
      <header class="header">
        <h1>見積書</h1>
        <div class="date">発行日 ${escapeHtml(new Date().toLocaleDateString('ja-JP'))}</div>
      </header>

      <section class="section">
        <div class="customer">${escapeHtml(customerName || '顧客名未入力')} 御中</div>
      </section>

      <section class="total">
        <div class="total-label">見積金額</div>
        <div class="total-amount">${escapeHtml(formatEstimateTotal(estimateAmount))}</div>
        <div class="formula">工数 × 時給 = ${escapeHtml(
          numberFormatter.format(parseAmount(hours))
        )}時間 × ${escapeHtml(formatYen(parseAmount(hourlyRate)))}</div>
      </section>

      <section class="section">
        <table>
          <tbody>
            <tr>
              <th>案件名</th>
              <td>${escapeHtml(projectName || '未入力')}</td>
            </tr>
            <tr>
              <th>作業内容</th>
              <td>${escapeHtml(workDescription || '未入力')}</td>
            </tr>
            <tr>
              <th>工数</th>
              <td>${escapeHtml(numberFormatter.format(parseAmount(hours)))}時間</td>
            </tr>
            <tr>
              <th>時給</th>
              <td>${escapeHtml(formatYen(parseAmount(hourlyRate)))}</td>
            </tr>
            <tr>
              <th>見積金額</th>
              <td>${escapeHtml(formatEstimateTotal(estimateAmount))}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  </body>
</html>`;
}

async function exportPdfOnWeb(html: string) {
  const browserGlobal = globalThis as BrowserPrintGlobal;
  const printWindow = browserGlobal.open?.('', '_blank');

  if (!printWindow) {
    throw new Error('PDF出力用のウィンドウを開けませんでした。ポップアップ許可を確認してください。');
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export default function EstimateScreen() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [hours, setHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');

  useEffect(() => {
    const storage = getBrowserStorage();

    if (!storage) {
      setIsStorageLoaded(true);
      return;
    }

    try {
      const savedForm = storage.getItem(storageKey);

      if (savedForm) {
        const parsedForm = JSON.parse(savedForm) as Partial<EstimateFormState>;

        setCustomerName(parsedForm.customerName ?? '');
        setProjectName(parsedForm.projectName ?? '');
        setWorkDescription(parsedForm.workDescription ?? '');
        setHours(parsedForm.hours ?? '');
        setHourlyRate(parsedForm.hourlyRate ?? '');
      }
    } catch {
      // Ignore invalid or unavailable browser storage and keep the form editable.
    } finally {
      setIsStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isStorageLoaded) {
      return;
    }

    const storage = getBrowserStorage();

    if (!storage) {
      return;
    }

    const formState: EstimateFormState = {
      customerName,
      projectName,
      workDescription,
      hours,
      hourlyRate,
    };

    try {
      storage.setItem(storageKey, JSON.stringify(formState));
    } catch {
      // Saving can fail in private browsing or when storage quota is exceeded.
    }
  }, [customerName, hours, hourlyRate, isStorageLoaded, projectName, workDescription]);

  const calculation = useMemo(() => {
    const parsedHours = parseAmount(hours);
    const parsedHourlyRate = parseAmount(hourlyRate);

    return {
      estimateAmount: calculateEstimateAmount(parsedHours, parsedHourlyRate),
      parsedHours,
      parsedHourlyRate,
    };
  }, [hours, hourlyRate]);

  const handleExportPdf = async () => {
    const fileName = `estimate-${formatDateForFileName(new Date())}.pdf`;
    const html = buildEstimatePdfHtml({
      customerName,
      estimateAmount: calculation.estimateAmount,
      fileName,
      hourlyRate,
      hours,
      projectName,
      workDescription,
    });

    setExportStatus('');

    try {
      if (Platform.OS === 'web') {
        await exportPdfOnWeb(html);
        setExportStatus(`PDF保存時のファイル名: ${fileName}`);
        return;
      }

      const { uri } = await Print.printToFileAsync({ html });
      const outputUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({
        from: uri,
        to: outputUri,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(outputUri, {
          dialogTitle: 'PDF出力',
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      }

      setExportStatus(`PDFを作成しました: ${fileName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PDF出力に失敗しました。';
      setExportStatus(message);
    }
  };

  const handleConvertToInvoice = () => {
    const storage = getBrowserStorage();
    const formState: EstimateFormState = {
      customerName,
      projectName,
      workDescription,
      hours,
      hourlyRate,
    };

    try {
      storage?.setItem(invoiceDraftStorageKey, JSON.stringify(formState));
      storage?.setItem(storageKey, JSON.stringify(formState));
    } catch {
      // The invoice screen can still use route navigation even if browser storage is unavailable.
    }

    router.push({
      pathname: '/invoice',
      params: formState,
    });
  };

  const saveEstimateHistoryLocally = () => {
    const storage = getBrowserStorage();
    const historyKey = 'ai-office-estimate-history';
    const record = {
      amount: calculation.estimateAmount,
      customerName,
      hourlyRate,
      hours,
      id: `est-${formatDateForFileName(new Date())}-${Date.now()}`,
      projectName,
      savedAt: new Date().toISOString(),
      workDescription,
    };

    const currentHistory = storage?.getItem(historyKey);
    const records = currentHistory ? (JSON.parse(currentHistory) as typeof record[]) : [];
    storage?.setItem(historyKey, JSON.stringify([record, ...records]));
  };

  const handleSaveEstimateHistory = async () => {
    setHistoryStatus('見積履歴を保存しています...');

    try {
      await saveEstimateRecord({
        amount: calculation.estimateAmount,
        customerName,
        hourlyRate: calculation.parsedHourlyRate,
        hours: calculation.parsedHours,
        projectName,
        workDescription,
      });
      setHistoryStatus('見積履歴をDBに保存しました。');
    } catch (error) {
      try {
        saveEstimateHistoryLocally();
        const message = error instanceof Error ? error.message : 'Supabase保存に失敗しました。';
        setHistoryStatus(`${message} ローカルに退避しました。`);
      } catch {
        setHistoryStatus('見積履歴の保存に失敗しました。');
      }
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">
      <View style={styles.content} lightColor="transparent" darkColor="transparent">
        <View style={styles.header} lightColor="transparent" darkColor="transparent">
          <Text style={styles.eyebrow}>見積金額</Text>
          <Text style={styles.title}>AI見積書</Text>
          <Text style={styles.description}>入力すると見積金額がリアルタイムで更新されます。</Text>
        </View>

        <View style={styles.totalCard} lightColor="#111827" darkColor="#111827">
          <Text style={styles.totalLabel} lightColor="#cbd5e1" darkColor="#cbd5e1">
            見積金額
          </Text>
          <Text style={styles.totalAmount} lightColor="#ffffff" darkColor="#ffffff">
            {formatEstimateTotal(calculation.estimateAmount)}
          </Text>
          <Text style={styles.totalFormula} lightColor="#e5e7eb" darkColor="#e5e7eb">
            <Text style={styles.formulaStrong}>
              工数 × {hourlyRateLabel} = {numberFormatter.format(calculation.parsedHours)}時間 ×{' '}
              {formatYen(calculation.parsedHourlyRate)}
            </Text>
          </Text>
          <Pressable style={styles.pdfButton} onPress={handleExportPdf}>
            <Text style={styles.pdfButtonText} lightColor="#111827" darkColor="#111827">
              PDF出力
            </Text>
          </Pressable>
          <Pressable style={styles.outlineButton} onPress={handleSaveEstimateHistory}>
            <Text style={styles.outlineButtonText}>履歴に保存</Text>
          </Pressable>
          <Pressable style={styles.convertButton} onPress={handleConvertToInvoice}>
            <Text style={styles.convertButtonText} lightColor="#ffffff" darkColor="#ffffff">
              請求書へ変換
            </Text>
          </Pressable>
          {historyStatus ? (
            <Text style={styles.exportStatus} lightColor="#cbd5e1" darkColor="#cbd5e1">
              {historyStatus}
            </Text>
          ) : null}
          {exportStatus ? (
            <Text style={styles.exportStatus} lightColor="#cbd5e1" darkColor="#cbd5e1">
              {exportStatus}
            </Text>
          ) : null}
        </View>

        <View style={styles.formCard}>
          <View style={styles.cardHeader} lightColor="transparent" darkColor="transparent">
            <Text style={styles.cardTitle}>入力内容</Text>
            <Text style={styles.cardDescription}>顧客情報と作業条件を入力してください。</Text>
          </View>

          <Field
            label="顧客名"
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="株式会社サンプル"
          />
          <Field
            label="案件名"
            value={projectName}
            onChangeText={setProjectName}
            placeholder="Webサイト制作"
          />
          <Field
            label="作業内容"
            value={workDescription}
            onChangeText={setWorkDescription}
            placeholder="要件定義、デザイン、実装など"
            multiline
            inputStyle={styles.textArea}
          />
          <View style={styles.amountRow} lightColor="transparent" darkColor="transparent">
            <Field
              label="工数"
              value={hours}
              onChangeText={setHours}
              placeholder="40"
              keyboardType="decimal-pad"
              suffix="時間"
            />
            <Field
              label={hourlyRateLabel}
              value={hourlyRate}
              onChangeText={setHourlyRate}
              placeholder="5000"
              keyboardType="number-pad"
              suffix="円"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  inputStyle?: TextInput['props']['style'];
  suffix?: string;
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType = 'default',
  inputStyle,
  suffix,
}: FieldProps) {
  return (
    <View style={styles.field} lightColor="transparent" darkColor="transparent">
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, suffix ? styles.inputWithSuffix : undefined, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          multiline={multiline}
          keyboardType={keyboardType}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#f5f7fb',
  },
  content: {
    width: '100%',
    maxWidth: 600,
    gap: 14,
  },
  header: {
    gap: 6,
    paddingHorizontal: 2,
  },
  eyebrow: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
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
  totalCard: {
    borderRadius: 8,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 5,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  totalAmount: {
    marginTop: 8,
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 44,
  },
  totalFormula: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  formulaStrong: {
    fontWeight: '800',
  },
  pdfButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  pdfButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  convertButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  convertButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  outlineButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  outlineButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  exportStatus: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  formCard: {
    gap: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  cardHeader: {
    gap: 4,
    marginBottom: 0,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  cardDescription: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  field: {
    gap: 6,
    flex: 1,
  },
  label: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  inputWrap: {
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#d8dee8',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 16,
  },
  inputWithSuffix: {
    paddingRight: 48,
  },
  suffix: {
    position: 'absolute',
    right: 14,
    top: 12,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  amountRow: {
    gap: 14,
  },
});
