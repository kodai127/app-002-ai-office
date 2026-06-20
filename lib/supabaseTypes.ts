export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      estimates: {
        Row: {
          id: string;
          customer_id: string | null;
          customer_name: string;
          project_name: string;
          work_description: string | null;
          hours: number;
          hourly_rate: number;
          amount: number;
          status: 'draft' | 'sent' | 'accepted';
          issued_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          customer_name: string;
          project_name: string;
          work_description?: string | null;
          hours?: number;
          hourly_rate?: number;
          amount?: number;
          status?: 'draft' | 'sent' | 'accepted';
          issued_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          customer_name?: string;
          project_name?: string;
          work_description?: string | null;
          hours?: number;
          hourly_rate?: number;
          amount?: number;
          status?: 'draft' | 'sent' | 'accepted';
          issued_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'estimates_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          estimate_id: string | null;
          customer_id: string | null;
          customer_name: string;
          project_name: string;
          work_description: string | null;
          hours: number;
          hourly_rate: number;
          amount: number;
          invoice_number: string;
          status: 'draft' | 'sent' | 'paid' | 'overdue';
          issued_at: string;
          due_date: string;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          estimate_id?: string | null;
          customer_id?: string | null;
          customer_name: string;
          project_name: string;
          work_description?: string | null;
          hours?: number;
          hourly_rate?: number;
          amount?: number;
          invoice_number: string;
          status?: 'draft' | 'sent' | 'paid' | 'overdue';
          issued_at?: string;
          due_date: string;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          estimate_id?: string | null;
          customer_id?: string | null;
          customer_name?: string;
          project_name?: string;
          work_description?: string | null;
          hours?: number;
          hourly_rate?: number;
          amount?: number;
          invoice_number?: string;
          status?: 'draft' | 'sent' | 'paid' | 'overdue';
          issued_at?: string;
          due_date?: string;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_estimate_id_fkey';
            columns: ['estimate_id'];
            isOneToOne: false;
            referencedRelation: 'estimates';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type CustomerRow = Database['public']['Tables']['customers']['Row'];
export type EstimateRow = Database['public']['Tables']['estimates']['Row'];
export type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
