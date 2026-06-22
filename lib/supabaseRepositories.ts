import { Customer, EstimateRecord, InvoiceRecord, ProjectRecord, ProjectStatus } from './officeData';
import { getCurrentUser } from './auth';
import { sanitizeOptionalText, sanitizeText, validateAmount, validateEmail } from './security';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { CustomerRow, EstimateRow, InvoiceRow, ProfileRow, ProjectRow } from './supabaseTypes';

function assertSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase環境変数が未設定です。');
  }

  return supabase;
}

function createId(prefix: string) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}_${randomId}`;
}

function toNullable(value: string | undefined) {
  return sanitizeOptionalText(value, 1000);
}

export function formatSupabaseError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const supabaseError = error as {
      code?: string;
      details?: string | null;
      hint?: string | null;
      message?: string;
    };
    const parts = [
      supabaseError.code ? `code: ${supabaseError.code}` : '',
      supabaseError.message ? `message: ${supabaseError.message}` : '',
      supabaseError.details ? `details: ${supabaseError.details}` : '',
      supabaseError.hint ? `hint: ${supabaseError.hint}` : '',
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' / ');
    }
  }

  return '不明なエラーが発生しました。';
}

function throwSupabaseError(context: string, error: unknown, _payload?: unknown): never {
  console.error(context, { error });
  throw new Error(`${context}: ${formatSupabaseError(error)}`);
}

function isMissingColumn(error: unknown, columnName: string) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const supabaseError = error as { code?: string; message?: string };

  return (
    (supabaseError.code === '42703' || supabaseError.code === 'PGRST204') &&
    Boolean(supabaseError.message?.includes(columnName))
  );
}

function isMissingCustomerNameColumn(error: unknown) {
  return isMissingColumn(error, 'customer_name');
}

async function requireUserId() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('クラウド保存にはログインが必要です。');
  }

  return user.id;
}

export type BillingProfile = {
  id: string;
  email: string;
  plan: 'free' | 'pro' | 'business';
  stripeCustomerId: string;
  subscriptionStatus: string;
};

export const freeResourceLimit = 3;
const paidSubscriptionStatuses = ['active', 'trialing', 'past_due'];

export function mapProfileRow(row: ProfileRow): BillingProfile {
  return {
    id: row.id,
    email: row.email ?? '',
    plan: row.plan,
    stripeCustomerId: row.stripe_customer_id ?? '',
    subscriptionStatus: row.subscription_status,
  };
}

export async function fetchOrCreateProfile() {
  const client = assertSupabase();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('プロフィール確認にはログインが必要です。');
  }

  const { data: existingProfile, error: fetchError } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existingProfile) {
    return mapProfileRow(existingProfile);
  }

  const now = new Date().toISOString();
  const { data, error } = await client
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email ?? null,
      plan: 'free',
      stripe_customer_id: null,
      subscription_status: 'free',
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapProfileRow(data);
}

function isPaidProfile(profile: BillingProfile) {
  return (
    (profile.plan === 'pro' || profile.plan === 'business') &&
    paidSubscriptionStatuses.includes(profile.subscriptionStatus)
  );
}

export type UsageSummary = {
  counts: {
    customers: number;
    estimates: number;
    invoices: number;
    projects: number;
  };
  isConfigured: boolean;
  isLoggedIn: boolean;
  limit: number | null;
  plan: BillingProfile['plan'];
  remaining: number | null;
  subscriptionStatus: string;
  used: number;
};

export type ProjectDashboardSummary = {
  activeCount: number;
  invoicedCount: number;
  monthlyRevenue: number;
  outstandingAmount: number;
  paidCount: number;
};

type LimitedResource = 'projects' | 'customers' | 'estimates' | 'invoices';

const limitedResourceLabels: Record<LimitedResource, string> = {
  customers: '顧客',
  estimates: '見積',
  invoices: '請求',
  projects: '案件',
};

async function countUserRecords(resource: LimitedResource, userId: string) {
  const client = assertSupabase();
  const { count, error } = await client.from(resource).select('id', { count: 'exact', head: true }).eq('user_id', userId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function recordExists(resource: LimitedResource, id: string, userId: string) {
  const client = assertSupabase();
  const { data, error } = await client.from(resource).select('id').eq('id', id).eq('user_id', userId).maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function assertCanSaveResource(resource: LimitedResource, recordId?: string) {
  const profile = await fetchOrCreateProfile();

  if (isPaidProfile(profile)) {
    return;
  }

  const userId = await requireUserId();

  if (recordId && (await recordExists(resource, recordId, userId))) {
    return;
  }

  const usedCount = await countUserRecords(resource, userId);

  if (usedCount >= freeResourceLimit) {
    const label = limitedResourceLabels[resource];
    throw new Error(`Freeプランの${label}保存は${freeResourceLimit}件までです。Proなら全て無制限で利用できます。`);
  }
}

export async function fetchUsageSummary(): Promise<UsageSummary> {
  const emptyCounts = {
    customers: 0,
    estimates: 0,
    invoices: 0,
    projects: 0,
  };

  if (!isSupabaseConfigured || !supabase) {
    return {
      counts: emptyCounts,
      isConfigured: false,
      isLoggedIn: false,
      limit: freeResourceLimit,
      plan: 'free',
      remaining: freeResourceLimit,
      subscriptionStatus: 'not_configured',
      used: 0,
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      counts: emptyCounts,
      isConfigured: true,
      isLoggedIn: false,
      limit: freeResourceLimit,
      plan: 'free',
      remaining: freeResourceLimit,
      subscriptionStatus: 'signed_out',
      used: 0,
    };
  }

  const profile = await fetchOrCreateProfile();
  const [projectCount, customerCount, estimateCount, invoiceCount] = await Promise.all([
    countUserRecords('projects', user.id),
    countUserRecords('customers', user.id),
    countUserRecords('estimates', user.id),
    countUserRecords('invoices', user.id),
  ]);
  const counts = {
    customers: customerCount,
    estimates: estimateCount,
    invoices: invoiceCount,
    projects: projectCount,
  };
  const used = projectCount + customerCount + estimateCount + invoiceCount;

  if (isPaidProfile(profile)) {
    return {
      counts,
      isConfigured: true,
      isLoggedIn: true,
      limit: null,
      plan: profile.plan,
      remaining: null,
      subscriptionStatus: profile.subscriptionStatus,
      used,
    };
  }

  return {
    counts,
    isConfigured: true,
    isLoggedIn: true,
    limit: freeResourceLimit,
    plan: 'free',
    remaining: Math.max(freeResourceLimit * 4 - used, 0),
    subscriptionStatus: profile.subscriptionStatus,
    used,
  };
}

export function mapCustomerRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    memo: row.memo ?? '',
    createdAt: row.created_at.slice(0, 10),
    updatedAt: row.updated_at.slice(0, 10),
  };
}

export function mapEstimateRow(row: EstimateRow): EstimateRecord {
  return {
    id: row.id,
    customerId: row.customer_id ?? '',
    customerName: row.customer_name,
    projectName: row.project_name,
    workDescription: row.work_description ?? '',
    hours: row.hours,
    hourlyRate: row.hourly_rate,
    amount: row.amount,
    status: row.status,
    issuedAt: row.issued_at,
    updatedAt: row.updated_at.slice(0, 10),
  };
}

export function mapInvoiceRow(row: InvoiceRow): InvoiceRecord {
  return {
    id: row.id,
    estimateId: row.estimate_id ?? undefined,
    customerId: row.customer_id ?? '',
    customerName: row.customer_name,
    projectName: row.project_name,
    amount: row.amount,
    invoiceNumber: row.invoice_number,
    status: row.status,
    issuedAt: row.issued_at,
    dueDate: row.due_date,
    paidAt: row.paid_at ?? undefined,
  };
}

export function mapProjectRow(row: ProjectRow, customerName = '顧客未設定'): ProjectRecord {
  return {
    id: row.id,
    customerId: row.customer_id ?? '',
    customerName: row.customer_name || customerName,
    name: row.name,
    amount: row.amount,
    status: row.status,
    memo: row.memo ?? '',
    dueDate: row.due_date,
    createdAt: row.created_at.slice(0, 10),
    updatedAt: row.updated_at.slice(0, 10),
  };
}

type ProjectRowWithCustomer = ProjectRow & {
  customers?: Pick<CustomerRow, 'name'> | null;
};

function mapProjectRowWithCustomer(row: ProjectRowWithCustomer): ProjectRecord {
  return mapProjectRow(row, row.customer_name || row.customers?.name || '顧客未設定');
}

export async function fetchCustomers() {
  const client = assertSupabase();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    if (isMissingColumn(error, 'user_id')) {
      console.error('customers.user_id列が未適用のため、user_id条件なしで顧客一覧を取得します', {
        error,
        userId,
      });

      const { data: fallbackData, error: fallbackError } = await client
        .from('customers')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fallbackError) {
        throwSupabaseError('顧客一覧の取得に失敗しました', fallbackError, { userId });
      }

      return fallbackData.map(mapCustomerRow);
    }

    throwSupabaseError('顧客一覧の取得に失敗しました', error, { userId });
  }

  return data.map(mapCustomerRow);
}

export async function fetchProjectRecords() {
  const client = assertSupabase();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('projects')
    .select('*, customers(name)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throwSupabaseError('案件一覧の取得に失敗しました', error);
  }

  return (data as ProjectRowWithCustomer[]).map(mapProjectRowWithCustomer);
}

export async function upsertProject(record: {
  amount: number;
  customerId: string;
  customerName: string;
  dueDate: string;
  id?: string;
  memo: string;
  name: string;
  status?: ProjectStatus;
}) {
  const client = assertSupabase();
  const userId = await requireUserId();
  await assertCanSaveResource('projects', record.id);
  const now = new Date().toISOString();
  const payload = {
    id: record.id || createId('prj'),
    user_id: userId,
    customer_id: sanitizeOptionalText(record.customerId, 120),
    customer_name: sanitizeText(record.customerName, 120) || '顧客未設定',
    name: sanitizeText(record.name, 120) || '新規案件',
    amount: validateAmount(record.amount),
    status: record.status ?? 'draft',
    memo: sanitizeOptionalText(record.memo, 2000),
    due_date: sanitizeText(record.dueDate, 10) || new Date().toISOString().slice(0, 10),
    updated_at: now,
    ...(record.id ? {} : { created_at: now }),
  };

  const { data, error } = await client
    .from('projects')
    .upsert(payload, { onConflict: 'id' })
    .select('*, customers(name)')
    .single();

  if (error) {
    if (isMissingCustomerNameColumn(error)) {
      const { customer_name: _customerName, ...fallbackPayload } = payload;

      console.error('projects.customer_name列が未適用のため、顧客名なしで案件保存を再試行します', { error });

      const { data: fallbackData, error: fallbackError } = await client
        .from('projects')
        .upsert(fallbackPayload, { onConflict: 'id' })
        .select('*, customers(name)')
        .single();

      if (fallbackError) {
        throwSupabaseError('案件の保存に失敗しました', fallbackError, fallbackPayload);
      }

      return {
        ...mapProjectRowWithCustomer(fallbackData as ProjectRowWithCustomer),
        customerName: record.customerName.trim() || '顧客未設定',
      };
    }

    throwSupabaseError('案件の保存に失敗しました', error, payload);
  }

  return mapProjectRowWithCustomer(data as ProjectRowWithCustomer);
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const client = assertSupabase();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('projects')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select('*, customers(name)')
    .single();

  if (error) {
    throwSupabaseError('案件ステータスの更新に失敗しました', error, { projectId, status, userId });
  }

  return mapProjectRowWithCustomer(data as ProjectRowWithCustomer);
}

export async function deleteProjectRecord(projectId: string) {
  const client = assertSupabase();
  const userId = await requireUserId();
  const { error } = await client.from('projects').delete().eq('id', projectId).eq('user_id', userId);

  if (error) {
    throwSupabaseError('案件の削除に失敗しました', error, { projectId, userId });
  }
}

export function summarizeProjects(projects: ProjectRecord[], today = new Date()): ProjectDashboardSummary {
  const monthlyRevenue = projects
    .filter((project) => {
      const updatedAt = new Date(`${project.updatedAt}T00:00:00`);

      return (
        project.status === 'paid' &&
        updatedAt.getFullYear() === today.getFullYear() &&
        updatedAt.getMonth() === today.getMonth()
      );
    })
    .reduce((total, project) => total + project.amount, 0);

  return {
    activeCount: projects.filter((project) => project.status !== 'paid').length,
    invoicedCount: projects.filter((project) => project.status === 'invoiced').length,
    monthlyRevenue,
    outstandingAmount: projects
      .filter((project) => project.status === 'invoiced')
      .reduce((total, project) => total + project.amount, 0),
    paidCount: projects.filter((project) => project.status === 'paid').length,
  };
}

export async function upsertCustomer(customer: Customer) {
  const client = assertSupabase();
  const userId = await requireUserId();
  await assertCanSaveResource('customers', customer.id);
  const now = new Date().toISOString();
  const payload = {
    id: customer.id || createId('cus'),
    user_id: userId,
    name: sanitizeText(customer.name, 120) || '新規顧客',
    contact_name: sanitizeOptionalText(customer.contactName, 120),
    email: validateEmail(customer.email),
    phone: sanitizeOptionalText(customer.phone, 40),
    address: sanitizeOptionalText(customer.address, 240),
    memo: sanitizeOptionalText(customer.memo, 2000),
    created_at: customer.createdAt ? `${customer.createdAt}T00:00:00.000Z` : now,
    updated_at: now,
  };
  const { data, error } = await client
    .from('customers')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    if (isMissingColumn(error, 'user_id')) {
      const { user_id: _userId, ...fallbackPayload } = payload;

      console.error('customers.user_id列が未適用のため、user_idなしで顧客保存を再試行します', { error });

      const { data: fallbackData, error: fallbackError } = await client
        .from('customers')
        .upsert(fallbackPayload as never, { onConflict: 'id' })
        .select()
        .single();

      if (fallbackError) {
        throwSupabaseError('顧客の保存に失敗しました', fallbackError, fallbackPayload);
      }

      return mapCustomerRow(fallbackData);
    }

    throwSupabaseError('顧客の保存に失敗しました', error, payload);
  }

  return mapCustomerRow(data);
}

export async function deleteCustomerRecord(customerId: string) {
  const client = assertSupabase();
  const userId = await requireUserId();
  const { error } = await client.from('customers').delete().eq('id', customerId).eq('user_id', userId);

  if (error) {
    if (isMissingColumn(error, 'user_id')) {
      console.error('customers.user_id列が未適用のため、id条件のみで顧客削除を再試行します', {
        customerId,
        error,
        userId,
      });

      const { error: fallbackError } = await client.from('customers').delete().eq('id', customerId);

      if (fallbackError) {
        throwSupabaseError('顧客の削除に失敗しました', fallbackError, { customerId });
      }

      return;
    }

    throwSupabaseError('顧客の削除に失敗しました', error, { customerId, userId });
  }
}

export async function fetchEstimateRecords() {
  const client = assertSupabase();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('estimates')
    .select('*')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data.map(mapEstimateRow);
}

export async function saveEstimateRecord(record: {
  amount: number;
  customerName: string;
  hourlyRate: number;
  hours: number;
  projectName: string;
  workDescription: string;
}) {
  const client = assertSupabase();
  await assertCanSaveResource('estimates');
  const userId = await requireUserId();
  const now = new Date();
  const { data, error } = await client
    .from('estimates')
    .insert({
      id: createId('est'),
      user_id: userId,
      customer_id: null,
      customer_name: sanitizeText(record.customerName, 120) || '顧客名未入力',
      project_name: sanitizeText(record.projectName, 120) || '案件名未入力',
      work_description: sanitizeOptionalText(record.workDescription, 2000),
      hours: validateAmount(record.hours, '工数'),
      hourly_rate: validateAmount(record.hourlyRate, '時間単価'),
      amount: validateAmount(record.amount),
      status: 'draft',
      issued_at: now.toISOString().slice(0, 10),
      updated_at: now.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapEstimateRow(data);
}

export async function fetchInvoiceRecords() {
  const client = assertSupabase();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data.map(mapInvoiceRow);
}

export async function saveInvoiceRecord(record: {
  amount: number;
  customerName: string;
  dueDate: string;
  hourlyRate: number;
  hours: number;
  invoiceNumber: string;
  issueDate: string;
  projectName: string;
  workDescription: string;
}) {
  const client = assertSupabase();
  await assertCanSaveResource('invoices');
  const userId = await requireUserId();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('invoices')
    .insert({
      id: createId('inv'),
      user_id: userId,
      estimate_id: null,
      customer_id: null,
      customer_name: sanitizeText(record.customerName, 120) || '顧客名未入力',
      project_name: sanitizeText(record.projectName, 120) || '案件名未入力',
      work_description: sanitizeOptionalText(record.workDescription, 2000),
      hours: validateAmount(record.hours, '工数'),
      hourly_rate: validateAmount(record.hourlyRate, '時間単価'),
      amount: validateAmount(record.amount),
      invoice_number: sanitizeText(record.invoiceNumber, 80),
      status: 'draft',
      issued_at: sanitizeText(record.issueDate, 10),
      due_date: sanitizeText(record.dueDate, 10),
      paid_at: null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapInvoiceRow(data);
}

export function createCustomerDraft(index: number): Customer {
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: createId('cus'),
    name: `新規顧客${index}`,
    contactName: '',
    email: '',
    phone: '',
    address: '',
    memo: '',
    createdAt: today,
    updatedAt: today,
  };
}
