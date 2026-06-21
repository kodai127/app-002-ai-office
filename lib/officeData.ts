export type Customer = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
};

export type EstimateRecord = {
  id: string;
  customerId: string;
  customerName: string;
  projectName: string;
  workDescription: string;
  hours: number;
  hourlyRate: number;
  amount: number;
  status: 'draft' | 'sent' | 'accepted';
  issuedAt: string;
  updatedAt: string;
};

export type InvoiceRecord = {
  id: string;
  estimateId?: string;
  customerId: string;
  customerName: string;
  projectName: string;
  amount: number;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
};

export type ProjectStatus = 'before_estimate' | 'estimated' | 'invoiced' | 'paid';

export type ProjectRecord = {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: ProjectStatus;
  memo: string;
  dueDate: string;
  estimateId?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
};

export type SupabaseTableDefinition = {
  name: string;
  purpose: string;
  columns: Array<{
    name: string;
    type: string;
    note: string;
  }>;
};

export const mockCustomers: Customer[] = [
  {
    id: 'cus_001',
    name: '株式会社サンプル',
    contactName: '山田 太郎',
    email: 'yamada@example.com',
    phone: '03-1234-5678',
    address: '東京都千代田区丸の内1-1-1',
    memo: '月次の改善提案あり。請求は月末締め。',
    createdAt: '2026-06-01',
    updatedAt: '2026-06-18',
  },
  {
    id: 'cus_002',
    name: '合同会社ブルー',
    contactName: '佐藤 花子',
    email: 'sato@example.com',
    phone: '06-2345-6789',
    address: '大阪府大阪市北区梅田2-2-2',
    memo: '初回取引。支払期限は発行日から30日。',
    createdAt: '2026-06-04',
    updatedAt: '2026-06-15',
  },
  {
    id: 'cus_003',
    name: 'ミライデザイン株式会社',
    contactName: '鈴木 一郎',
    email: 'suzuki@example.com',
    phone: '052-3456-7890',
    address: '愛知県名古屋市中村区名駅3-3-3',
    memo: 'Web制作と運用保守を継続提案中。',
    createdAt: '2026-05-28',
    updatedAt: '2026-06-12',
  },
];

export const mockEstimateRecords: EstimateRecord[] = [
  {
    id: 'est_20260601_001',
    customerId: 'cus_001',
    customerName: '株式会社サンプル',
    projectName: 'コーポレートサイト改善',
    workDescription: '要件整理、UI改善、実装、公開作業',
    hours: 40,
    hourlyRate: 5000,
    amount: 200000,
    status: 'accepted',
    issuedAt: '2026-06-03',
    updatedAt: '2026-06-08',
  },
  {
    id: 'est_20260607_001',
    customerId: 'cus_002',
    customerName: '合同会社ブルー',
    projectName: 'LP制作',
    workDescription: '構成案、デザイン、React実装',
    hours: 32,
    hourlyRate: 6000,
    amount: 192000,
    status: 'sent',
    issuedAt: '2026-06-07',
    updatedAt: '2026-06-07',
  },
  {
    id: 'est_20260614_001',
    customerId: 'cus_003',
    customerName: 'ミライデザイン株式会社',
    projectName: '保守運用プラン',
    workDescription: '月次更新、軽微修正、レポート作成',
    hours: 20,
    hourlyRate: 7000,
    amount: 140000,
    status: 'draft',
    issuedAt: '2026-06-14',
    updatedAt: '2026-06-16',
  },
];

export const mockInvoiceRecords: InvoiceRecord[] = [
  {
    id: 'inv_20260610_001',
    estimateId: 'est_20260601_001',
    customerId: 'cus_001',
    customerName: '株式会社サンプル',
    projectName: 'コーポレートサイト改善',
    amount: 200000,
    invoiceNumber: 'INV-20260610-001',
    status: 'sent',
    issuedAt: '2026-06-10',
    dueDate: '2026-07-10',
  },
  {
    id: 'inv_20260615_001',
    customerId: 'cus_003',
    customerName: 'ミライデザイン株式会社',
    projectName: '保守運用プラン',
    amount: 140000,
    invoiceNumber: 'INV-20260615-001',
    status: 'paid',
    issuedAt: '2026-06-15',
    dueDate: '2026-07-15',
    paidAt: '2026-06-19',
  },
];

export const mockProjectRecords: ProjectRecord[] = [
  {
    id: 'prj_20260601_001',
    name: 'コーポレートサイト改善',
    customerId: 'cus_001',
    customerName: '株式会社サンプル',
    amount: 200000,
    status: 'invoiced',
    memo: '請求済み。7月10日入金予定。',
    dueDate: '2026-07-10',
    estimateId: 'est_20260601_001',
    invoiceId: 'inv_20260610_001',
    createdAt: '2026-06-01',
    updatedAt: '2026-06-10',
  },
  {
    id: 'prj_20260607_001',
    name: 'LP制作',
    customerId: 'cus_002',
    customerName: '合同会社ブルー',
    amount: 192000,
    status: 'estimated',
    memo: '見積送付済み。正式発注待ち。',
    dueDate: '2026-07-05',
    estimateId: 'est_20260607_001',
    createdAt: '2026-06-07',
    updatedAt: '2026-06-07',
  },
  {
    id: 'prj_20260614_001',
    name: '保守運用プラン',
    customerId: 'cus_003',
    customerName: 'ミライデザイン株式会社',
    amount: 140000,
    status: 'paid',
    memo: '入金確認済み。翌月分の継続提案あり。',
    dueDate: '2026-07-15',
    estimateId: 'est_20260614_001',
    invoiceId: 'inv_20260615_001',
    createdAt: '2026-06-14',
    updatedAt: '2026-06-19',
  },
  {
    id: 'prj_20260618_001',
    name: 'AI業務ツールPoC',
    customerId: 'cus_001',
    customerName: '株式会社サンプル',
    amount: 320000,
    status: 'before_estimate',
    memo: '要件ヒアリング後に見積作成予定。',
    dueDate: '2026-06-28',
    createdAt: '2026-06-18',
    updatedAt: '2026-06-18',
  },
];

export const supabaseTableDefinitions: SupabaseTableDefinition[] = [
  {
    name: 'profiles',
    purpose: 'ログインユーザーのプランとStripe連携状態を管理。',
    columns: [
      { name: 'id', type: 'uuid primary key', note: 'auth.users.id と一致。' },
      { name: 'email', type: 'text', note: 'ログインメール' },
      { name: 'plan', type: 'text default free', note: 'free/pro/business' },
      { name: 'stripe_customer_id', type: 'text', note: 'Stripe顧客ID' },
      { name: 'subscription_status', type: 'text', note: 'free/active/canceled など' },
      { name: 'created_at', type: 'timestamptz', note: '作成日時' },
      { name: 'updated_at', type: 'timestamptz', note: '更新日時' },
    ],
  },
  {
    name: 'customers',
    purpose: '顧客マスタ。見積・請求書の参照元。',
    columns: [
      { name: 'id', type: 'text primary key', note: '顧客ID。アプリ側で生成。' },
      { name: 'user_id', type: 'uuid references auth.users(id)', note: '所有ユーザー。RLSで分離。' },
      { name: 'name', type: 'text not null', note: '会社名または顧客名' },
      { name: 'contact_name', type: 'text', note: '担当者名' },
      { name: 'email', type: 'text', note: '連絡先メール' },
      { name: 'phone', type: 'text', note: '電話番号' },
      { name: 'address', type: 'text', note: '住所' },
      { name: 'memo', type: 'text', note: '社内メモ' },
      { name: 'created_at', type: 'timestamptz', note: '作成日時' },
      { name: 'updated_at', type: 'timestamptz', note: '更新日時' },
    ],
  },
  {
    name: 'projects',
    purpose: '案件を起点に、見積・請求・入金確認までの状態を管理。',
    columns: [
      { name: 'id', type: 'text primary key', note: '案件ID。アプリ側で生成。' },
      { name: 'user_id', type: 'uuid references auth.users(id)', note: '所有ユーザー。RLSで分離。' },
      { name: 'customer_id', type: 'text references customers(id)', note: '顧客ID' },
      { name: 'customer_name', type: 'text not null', note: '保存時点の顧客名' },
      { name: 'name', type: 'text not null', note: '案件名' },
      { name: 'amount', type: 'numeric not null default 0', note: '案件金額' },
      { name: 'status', type: 'text not null default before_estimate', note: 'before_estimate/estimated/invoiced/paid' },
      { name: 'memo', type: 'text', note: '案件メモ' },
      { name: 'due_date', type: 'date', note: '期限または入金予定日' },
      { name: 'estimate_id', type: 'text references estimates(id)', note: '紐付く見積ID' },
      { name: 'invoice_id', type: 'text references invoices(id)', note: '紐付く請求書ID' },
      { name: 'created_at', type: 'timestamptz', note: '作成日時' },
      { name: 'updated_at', type: 'timestamptz', note: '更新日時' },
    ],
  },
  {
    name: 'estimates',
    purpose: '見積履歴。再編集と請求書変換の元データ。',
    columns: [
      { name: 'id', type: 'text primary key', note: '見積ID。アプリ側で生成。' },
      { name: 'user_id', type: 'uuid references auth.users(id)', note: '所有ユーザー。RLSで分離。' },
      { name: 'customer_id', type: 'text references customers(id)', note: '顧客ID。未紐付け時はnull。' },
      { name: 'customer_name', type: 'text not null', note: '保存時点の顧客名' },
      { name: 'project_name', type: 'text not null', note: '案件名' },
      { name: 'work_description', type: 'text', note: '作業内容' },
      { name: 'hours', type: 'numeric not null default 0', note: '工数' },
      { name: 'hourly_rate', type: 'numeric not null default 0', note: '時給' },
      { name: 'amount', type: 'numeric not null default 0', note: '見積金額' },
      { name: 'status', type: 'text not null default draft', note: 'draft/sent/accepted' },
      { name: 'issued_at', type: 'date', note: '発行日' },
      { name: 'updated_at', type: 'timestamptz', note: '更新日時' },
    ],
  },
  {
    name: 'invoices',
    purpose: '請求書履歴。入金管理とPDF再出力に利用。',
    columns: [
      { name: 'id', type: 'text primary key', note: '請求書ID。アプリ側で生成。' },
      { name: 'user_id', type: 'uuid references auth.users(id)', note: '所有ユーザー。RLSで分離。' },
      { name: 'estimate_id', type: 'text references estimates(id)', note: '元見積ID。未紐付け時はnull。' },
      { name: 'customer_id', type: 'text references customers(id)', note: '顧客ID。未紐付け時はnull。' },
      { name: 'customer_name', type: 'text not null', note: '保存時点の顧客名' },
      { name: 'project_name', type: 'text not null', note: '案件名' },
      { name: 'work_description', type: 'text', note: '作業内容' },
      { name: 'hours', type: 'numeric not null default 0', note: '工数' },
      { name: 'hourly_rate', type: 'numeric not null default 0', note: '時給' },
      { name: 'invoice_number', type: 'text not null unique', note: '請求書番号' },
      { name: 'amount', type: 'numeric not null default 0', note: '請求金額' },
      { name: 'status', type: 'text not null default draft', note: 'draft/sent/paid/overdue' },
      { name: 'issued_at', type: 'date', note: '発行日' },
      { name: 'due_date', type: 'date', note: '支払期限' },
      { name: 'paid_at', type: 'date', note: '入金日' },
      { name: 'created_at', type: 'timestamptz', note: '作成日時' },
      { name: 'updated_at', type: 'timestamptz', note: '更新日時' },
    ],
  },
];

export function formatCurrency(amount: number) {
  return `${new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits: 0,
  }).format(amount)}円`;
}

export function isThisMonth(dateString: string, today = new Date()) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

export function getProjectStatusLabel(status: ProjectStatus) {
  const labels: Record<ProjectStatus, string> = {
    before_estimate: '見積前',
    estimated: '見積済み',
    invoiced: '請求済み',
    paid: '入金済み',
  };

  return labels[status];
}

export function isOverdue(dateString: string, today = new Date()) {
  const date = new Date(`${dateString}T00:00:00`);
  const baseline = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return date < baseline;
}
