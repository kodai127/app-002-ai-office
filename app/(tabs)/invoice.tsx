import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { AppHeader } from '@/components/AppHeader';
import { SeoHead } from '@/components/SeoHead';
import { Text, View } from '@/components/Themed';
import { UsageLimitPanel } from '@/components/UsageLimitPanel';
import { formatCurrency, InvoiceRecord } from '@/lib/officeData';
import { fetchInvoiceRecords, saveInvoiceRecord } from '@/lib/supabaseRepositories';

const numberFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 2,
});

const manYenUnit = 10000;
const estimateStorageKey = 'ai-office-estimate-form';
const invoiceDraftStorageKey = 'ai-office-invoice-draft';
const invoiceStorageKey = 'ai-office-invoice-form';

type InvoiceFormState = {
  customerName: string;
  projectName: string;
  workDescription: string;
  hours: string;
  hourlyRate: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
};

type EstimateFormState = Pick<
  InvoiceFormState,
  'customerName' | 'projectName' | 'workDescription' | 'hours' | 'hourlyRate'
>;

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

type LocalInvoiceHistoryRecord = {
  amount: number;
  customerName: string;
  dueDate: string;
  id: string;
  invoiceNumber: string;
  issueDate: string;
  projectName: string;
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

function calculateAmount(hours: number, hourlyRate: number) {
  return hours * hourlyRate;
}

function formatYen(amount: number) {
  return `${numberFormatter.format(amount)}円`;
}

function formatTotal(amount: number) {
  if (amount >= manYenUnit && Number.isInteger(amount) && amount % manYenUnit === 0) {
    return `${numberFormatter.format(amount / manYenUnit)}万円`;
  }

  return formatYen(amount);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateForFileName(date: Date) {
  return formatDateInput(date).replace(/-/g, '');
}

function createDefaultInvoiceNumber(date: Date) {
  return `INV-${formatDateForFileName(date)}-001`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
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

function buildInvoicePdfHtml({
  amount,
  customerName,
  dueDate,
  fileName,
  hourlyRate,
  hours,
  invoiceNumber,
  issueDate,
  projectName,
  workDescription,
}: InvoiceFormState & {
  amount: number;
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
      .meta {
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
    <main>
      <header class="header">
        <h1>請求書</h1>
        <div class="meta">
          請求書番号 ${escapeHtml(invoiceNumber || '未入力')}<br />
          発行日 ${escapeHtml(issueDate || '未入力')}<br />
          支払期限 ${escapeHtml(dueDate || '未入力')}
        </div>
      </header>

      <section class="section">
        <div class="customer">${escapeHtml(customerName || '顧客名未入力')} 御中</div>
      </section>

      <section class="total">
        <div class="total-label">請求金額</div>
        <div class="total-amount">${escapeHtml(formatTotal(amount))}</div>
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
              <th>請求金額</th>
              <td>${escapeHtml(formatTotal(amount))}</td>
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

function readSavedForm(storage: BrowserStorage | null) {
  if (!storage) {
    return null;
  }

  const invoiceForm = storage.getItem(invoiceStorageKey);
  const invoiceDraft = storage.getItem(invoiceDraftStorageKey);
  const estimateForm = storage.getItem(estimateStorageKey);
  const savedForm = invoiceForm ?? invoiceDraft ?? estimateForm;

  if (!savedForm) {
    return null;
  }

  return JSON.parse(savedForm) as Partial<InvoiceFormState & EstimateFormState>;
}

export default function InvoiceScreen() {
  const params = useLocalSearchParams<Partial<EstimateFormState>>();
  const today = useMemo(() => new Date(), []);
  const routeCustomerName = typeof params.customerName === 'string' ? params.customerName : '';
  const routeProjectName = typeof params.projectName === 'string' ? params.projectName : '';
  const routeWorkDescription = typeof params.workDescription === 'string' ? params.workDescription : '';
  const routeHours = typeof params.hours === 'string' ? params.hours : '';
  const routeHourlyRate = typeof params.hourlyRate === 'string' ? params.hourlyRate : '';
  const [customerName, setCustomerName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [hours, setHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(() => createDefaultInvoiceNumber(today));
  const [issueDate, setIssueDate] = useState(() => formatDateInput(today));
  const [dueDate, setDueDate] = useState(() => formatDateInput(addDays(today, 30)));
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceRecord[]>([]);
  const [localInvoiceHistory, setLocalInvoiceHistory] = useState<LocalInvoiceHistoryRecord[]>([]);
  const [usageRefreshKey, setUsageRefreshKey] = useState(0);

  useEffect(() => {
    const storage = getBrowserStorage();

    try {
      const savedForm = readSavedForm(storage);
      const routeForm = [routeCustomerName, routeProjectName, routeWorkDescription, routeHours, routeHourlyRate].some(
        (value) => value.length > 0
      )
        ? {
            customerName: routeCustomerName,
            hourlyRate: routeHourlyRate,
            hours: routeHours,
            projectName: routeProjectName,
            workDescription: routeWorkDescription,
          }
        : null;
      const initialForm = routeForm ?? savedForm;

      if (initialForm) {
        setCustomerName(typeof initialForm.customerName === 'string' ? initialForm.customerName : '');
        setProjectName(typeof initialForm.projectName === 'string' ? initialForm.projectName : '');
        setWorkDescription(
          typeof initialForm.workDescription === 'string' ? initialForm.workDescription : ''
        );
        setHours(typeof initialForm.hours === 'string' ? initialForm.hours : '');
        setHourlyRate(typeof initialForm.hourlyRate === 'string' ? initialForm.hourlyRate : '');
        setInvoiceNumber(
          'invoiceNumber' in initialForm && typeof initialForm.invoiceNumber === 'string'
            ? initialForm.invoiceNumber
            : createDefaultInvoiceNumber(today)
        );
        setIssueDate(
          'issueDate' in initialForm && typeof initialForm.issueDate === 'string'
            ? initialForm.issueDate
            : formatDateInput(today)
        );
        setDueDate(
          'dueDate' in initialForm && typeof initialForm.dueDate === 'string'
            ? initialForm.dueDate
            : formatDateInput(addDays(today, 30))
        );
      }
    } catch {
      // Ignore invalid browser storage and keep the invoice editable.
    } finally {
      setIsStorageLoaded(true);
    }
  }, [routeCustomerName, routeHourlyRate, routeHours, routeProjectName, routeWorkDescription, today]);

  useEffect(() => {
    if (!isStorageLoaded) {
      return;
    }

    const storage = getBrowserStorage();

    if (!storage) {
      return;
    }

    const formState: InvoiceFormState = {
      customerName,
      dueDate,
      hourlyRate,
      hours,
      invoiceNumber,
      issueDate,
      projectName,
      workDescription,
    };

    try {
      storage.setItem(invoiceStorageKey, JSON.stringify(formState));
    } catch {
      // Saving can fail in private browsing or when storage quota is exceeded.
    }
  }, [
    customerName,
    dueDate,
    hourlyRate,
    hours,
    invoiceNumber,
    isStorageLoaded,
    issueDate,
    projectName,
    workDescription,
  ]);

  useEffect(() => {
    const storage = getBrowserStorage();
    const currentHistory = storage?.getItem('ai-office-invoice-history');

    if (currentHistory) {
      try {
        setLocalInvoiceHistory(JSON.parse(currentHistory) as LocalInvoiceHistoryRecord[]);
      } catch {
        setLocalInvoiceHistory([]);
      }
    }

    let isMounted = true;

    async function loadInvoiceHistory() {
      try {
        const records = await fetchInvoiceRecords();

        if (isMounted) {
          setInvoiceHistory(records);
        }
      } catch {
        if (isMounted) {
          setInvoiceHistory([]);
        }
      }
    }

    loadInvoiceHistory();

    return () => {
      isMounted = false;
    };
  }, [historyStatus]);

  const calculation = useMemo(() => {
    const parsedHours = parseAmount(hours);
    const parsedHourlyRate = parseAmount(hourlyRate);

    return {
      amount: calculateAmount(parsedHours, parsedHourlyRate),
      parsedHours,
      parsedHourlyRate,
    };
  }, [hours, hourlyRate]);

  const handleExportPdf = async () => {
    const fileName = `invoice-${formatDateForFileName(new Date())}.pdf`;
    const html = buildInvoicePdfHtml({
      amount: calculation.amount,
      customerName,
      dueDate,
      fileName,
      hourlyRate,
      hours,
      invoiceNumber,
      issueDate,
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

  const saveInvoiceHistoryLocally = () => {
    const storage = getBrowserStorage();
    const historyKey = 'ai-office-invoice-history';
    const record = {
      amount: calculation.amount,
      customerName,
      dueDate,
      hourlyRate,
      hours,
      id: `inv-${formatDateForFileName(new Date())}-${Date.now()}`,
      invoiceNumber,
      issueDate,
      projectName,
      savedAt: new Date().toISOString(),
      workDescription,
    };

    const currentHistory = storage?.getItem(historyKey);
    const records = currentHistory ? (JSON.parse(currentHistory) as typeof record[]) : [];
    const nextRecords = [record, ...records];
    storage?.setItem(historyKey, JSON.stringify(nextRecords));
    setLocalInvoiceHistory(nextRecords);
  };

  const handleSaveInvoiceHistory = async () => {
    setHistoryStatus('請求書履歴を保存しています...');

    try {
      const savedInvoice = await saveInvoiceRecord({
        amount: calculation.amount,
        customerName,
        dueDate,
        hourlyRate: calculation.parsedHourlyRate,
        hours: calculation.parsedHours,
        invoiceNumber,
        issueDate,
        projectName,
        workDescription,
      });
      setInvoiceHistory((currentHistory) => [
        savedInvoice,
        ...currentHistory.filter((invoice) => invoice.id !== savedInvoice.id),
      ]);
      setUsageRefreshKey((currentKey) => currentKey + 1);
      setHistoryStatus('請求書履歴をDBに保存しました。');
    } catch (error) {
      setUsageRefreshKey((currentKey) => currentKey + 1);
      try {
        saveInvoiceHistoryLocally();
        const message = error instanceof Error ? error.message : 'Supabase保存に失敗しました。';
        const upgradeMessage = message.includes('月3回') ? ' Proで無制限利用できます。' : '';
        setHistoryStatus(`${message}${upgradeMessage} ローカルに退避しました。`);
      } catch {
        setHistoryStatus('請求書履歴の保存に失敗しました。');
      }
    }
  };

  return (
    <>
      <SeoHead
        title="請求書作成"
        description="ブラウザで請求書番号、支払期限、請求内容を入力し、請求書PDFを作成できます。"
        path="/invoice"
      />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <AppHeader />
        <View style={styles.content} lightColor="transparent" darkColor="transparent">
          <View style={styles.header} lightColor="transparent" darkColor="transparent">
            <Text style={styles.eyebrow}>請求書</Text>
            <Text style={styles.title}>請求書作成</Text>
            <Text style={styles.description}>見積内容を引き継いで請求書を作成できます。</Text>
          </View>

          <UsageLimitPanel refreshKey={usageRefreshKey} />

          <View style={styles.totalCard} lightColor="#111827" darkColor="#111827">
          <Text style={styles.totalLabel} lightColor="#cbd5e1" darkColor="#cbd5e1">
            請求金額
          </Text>
          <Text style={styles.totalAmount} lightColor="#ffffff" darkColor="#ffffff">
            {formatTotal(calculation.amount)}
          </Text>
          <Text style={styles.totalFormula} lightColor="#e5e7eb" darkColor="#e5e7eb">
            <Text style={styles.formulaStrong}>
              工数 × 時給 = {numberFormatter.format(calculation.parsedHours)}時間 ×{' '}
              {formatYen(calculation.parsedHourlyRate)}
            </Text>
          </Text>
          <Pressable style={styles.pdfButton} onPress={handleExportPdf}>
            <Text style={styles.pdfButtonText} lightColor="#111827" darkColor="#111827">
              PDF出力
            </Text>
          </Pressable>
          <Pressable style={styles.outlineButton} onPress={handleSaveInvoiceHistory}>
            <Text style={styles.outlineButtonText}>履歴に保存</Text>
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
            <Text style={styles.cardTitle}>請求情報</Text>
            <Text style={styles.cardDescription}>請求書番号、発行日、支払期限を入力してください。</Text>
          </View>

          <Field
            label="請求書番号"
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            placeholder="INV-20260620-001"
          />
          <View style={styles.amountRow} lightColor="transparent" darkColor="transparent">
            <Field
              label="発行日"
              value={issueDate}
              onChangeText={setIssueDate}
              placeholder="2026-06-20"
              keyboardType="numbers-and-punctuation"
            />
            <Field
              label="支払期限"
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="2026-07-20"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          </View>

          <View style={styles.formCard}>
          <View style={styles.cardHeader} lightColor="transparent" darkColor="transparent">
            <Text style={styles.cardTitle}>請求内容</Text>
            <Text style={styles.cardDescription}>見積から引き継いだ内容を必要に応じて調整できます。</Text>
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
              label="時給"
              value={hourlyRate}
              onChangeText={setHourlyRate}
              placeholder="5000"
              keyboardType="number-pad"
              suffix="円"
            />
          </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.cardHeader} lightColor="transparent" darkColor="transparent">
              <Text style={styles.cardTitle}>請求書履歴</Text>
              <Text style={styles.cardDescription}>
                ログイン中はSupabaseへ保存した履歴、未ログイン時はブラウザ内に退避した履歴を表示します。
              </Text>
            </View>
            {invoiceHistory.slice(0, 5).map((invoice) => (
              <View key={invoice.id} style={styles.historyRow} lightColor="transparent" darkColor="transparent">
                <View style={styles.historyBody} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.historyTitle}>{invoice.invoiceNumber}</Text>
                  <Text style={styles.historySub}>
                    {invoice.customerName} / 期限 {invoice.dueDate}
                  </Text>
                </View>
                <Text style={styles.historyAmount}>{formatCurrency(invoice.amount)}</Text>
              </View>
            ))}
            {invoiceHistory.length === 0
              ? localInvoiceHistory.slice(0, 5).map((invoice) => (
                  <View key={invoice.id} style={styles.historyRow} lightColor="transparent" darkColor="transparent">
                    <View style={styles.historyBody} lightColor="transparent" darkColor="transparent">
                      <Text style={styles.historyTitle}>{invoice.invoiceNumber}</Text>
                      <Text style={styles.historySub}>
                        {invoice.customerName} / 期限 {invoice.dueDate}
                      </Text>
                    </View>
                    <Text style={styles.historyAmount}>{formatCurrency(invoice.amount)}</Text>
                  </View>
                ))
              : null}
            {invoiceHistory.length === 0 && localInvoiceHistory.length === 0 ? (
              <Text style={styles.cardDescription}>まだ請求書履歴はありません。</Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad' | 'numbers-and-punctuation';
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
  historyRow: {
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    gap: 8,
    paddingTop: 12,
  },
  historyBody: {
    gap: 2,
  },
  historyTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  historySub: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  historyAmount: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '800',
  },
  amountRow: {
    gap: 14,
  },
});
