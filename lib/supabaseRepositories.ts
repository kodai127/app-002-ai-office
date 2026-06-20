import { Customer, EstimateRecord, InvoiceRecord } from './officeData';
import { getCurrentUser } from './auth';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { CustomerRow, EstimateRow, InvoiceRow, ProfileRow } from './supabaseTypes';

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
  return value?.trim() ? value.trim() : null;
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

export async function fetchCustomers() {
  const client = assertSupabase();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data.map(mapCustomerRow);
}

export async function upsertCustomer(customer: Customer) {
  const client = assertSupabase();
  const userId = await requireUserId();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('customers')
    .upsert(
      {
        id: customer.id || createId('cus'),
        user_id: userId,
        name: customer.name || '新規顧客',
        contact_name: toNullable(customer.contactName),
        email: toNullable(customer.email),
        phone: toNullable(customer.phone),
        address: toNullable(customer.address),
        memo: toNullable(customer.memo),
        created_at: customer.createdAt ? `${customer.createdAt}T00:00:00.000Z` : now,
        updated_at: now,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapCustomerRow(data);
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
  const userId = await requireUserId();
  const now = new Date();
  const { data, error } = await client
    .from('estimates')
    .insert({
      id: createId('est'),
      user_id: userId,
      customer_id: null,
      customer_name: record.customerName || '顧客名未入力',
      project_name: record.projectName || '案件名未入力',
      work_description: toNullable(record.workDescription),
      hours: record.hours,
      hourly_rate: record.hourlyRate,
      amount: record.amount,
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
  const userId = await requireUserId();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('invoices')
    .insert({
      id: createId('inv'),
      user_id: userId,
      estimate_id: null,
      customer_id: null,
      customer_name: record.customerName || '顧客名未入力',
      project_name: record.projectName || '案件名未入力',
      work_description: toNullable(record.workDescription),
      hours: record.hours,
      hourly_rate: record.hourlyRate,
      amount: record.amount,
      invoice_number: record.invoiceNumber,
      status: 'draft',
      issued_at: record.issueDate,
      due_date: record.dueDate,
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
