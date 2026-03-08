// ============================================================
// Tipos de base de datos — refleja el esquema de Supabase
// ============================================================

export type Currency = "EUR" | "USD" | "GBP";

// ---- Vendors ----
export interface Vendor {
  id: string;
  name: string;
  category_default: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export type VendorInsert = Omit<Vendor, "id" | "created_at">;
export type VendorUpdate = Partial<VendorInsert>;

// ---- Clients ----
export type ClientStatus = "active" | "inactive";

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  nif: string | null;
  address: string | null;
  notes: string | null;
  status: ClientStatus;
  created_at: string;
}

export type ClientInsert = Omit<Client, "id" | "created_at">;
export type ClientUpdate = Partial<ClientInsert>;

// ---- User settings (empresa emisora) ----
export interface UserSettings {
  user_id: string;
  company_name: string | null;
  company_tax_id: string | null;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_logo_url: string | null;
  accent_color: string;
  document_language: "es" | "en";
  updated_at: string;
}

export type UserSettingsInsert = Omit<UserSettings, "updated_at">;
export type UserSettingsUpdate = Partial<Omit<UserSettings, "user_id" | "updated_at">>;

// ---- Saved credentials (accesos: sitio, correo, contraseña, para qué sirve) ----
export interface SavedCredential {
  id: string;
  user_id: string;
  site: string;
  email: string;
  password: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SavedCredentialInsert = Omit<SavedCredential, "id" | "created_at" | "updated_at">;
export type SavedCredentialUpdate = Partial<Omit<SavedCredentialInsert, "user_id">>;

// ---- Projects ----
export type ProjectStatus = "active" | "paused" | "completed" | "cancelled";
export type ProjectType = "web" | "app" | "marketing" | "consulting" | "ecommerce" | "otro";

export interface Project {
  id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  type: ProjectType | null;
  budget: number | null;
  currency: Currency;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  is_saas: boolean;
  created_at: string;
  // Relación
  client?: Client;
}

export type ProjectInsert = Omit<Project, "id" | "created_at" | "client">;
export type ProjectUpdate = Partial<ProjectInsert>;

// ---- Billing type (compartido por Mensualidades y SaaS Plans) ----
// monthly       → fee/mes
// annual        → fee/año
// setup_monthly → setup_fee único + fee/mes
// setup_annual  → setup_fee único + fee/año
export type SaasBillingType = "monthly" | "annual" | "setup_monthly" | "setup_annual";

// ---- Mensualidades ----
// Facturación recurrente por cliente. project_id es OPCIONAL.
// Funciona tanto para proyectos SaaS como para retainers sin proyecto.
export type MensualidadStatus = "active" | "paused" | "cancelled";

export interface Mensualidad {
  id: string;
  client_id: string;
  project_id: string | null; // OPCIONAL
  name: string;
  billing_type: SaasBillingType;
  fee: number;
  setup_fee: number | null;
  currency: Currency;
  status: MensualidadStatus;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  // Relaciones
  client?: Client;
  project?: Project | null;
}

export type MensualidadInsert = Omit<Mensualidad, "id" | "created_at" | "client" | "project">;
export type MensualidadUpdate = Partial<MensualidadInsert>;

// ---- Mensualidad Payments (cobros reales de mensualidades) ----
export interface MensualidadPayment {
  id: string;
  mensualidad_id: string;
  client_id: string | null;
  project_id: string | null;
  payment_date: string;
  amount: number;
  currency: Currency;
  payment_method: PaymentMethod | null;
  is_setup: boolean;
  notes: string | null;
  created_at: string;
  // Relaciones
  mensualidad?: Mensualidad;
  client?: Client | null;
  project?: Project | null;
}

export type MensualidadPaymentInsert = Omit<
  MensualidadPayment,
  "id" | "created_at" | "mensualidad" | "client" | "project"
>;
export type MensualidadPaymentUpdate = Partial<MensualidadPaymentInsert>;

// ---- SaaS Plans ----

export interface SaasPlan {
  id: string;
  project_id: string;
  name: string;
  billing_type: SaasBillingType;
  fee: number;           // cuota recurrente (mensual o anual según billing_type)
  setup_fee: number | null; // pago único inicial (solo para setup_*)
  currency: Currency;
  description: string | null;
  created_at: string;
}

export type SaasPlanInsert = Omit<SaasPlan, "id" | "created_at">;
export type SaasPlanUpdate = Partial<SaasPlanInsert>;

// ---- SaaS Subscriptions ----
export type SaasSubscriptionStatus = "active" | "paused" | "cancelled";

export interface SaasSubscription {
  id: string;
  project_id: string;
  client_id: string;
  plan_id: string | null;
  is_free: boolean;
  status: SaasSubscriptionStatus;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  // Relaciones
  client?: Client;
  plan?: SaasPlan | null;
}

export type SaasSubscriptionInsert = Omit<SaasSubscription, "id" | "created_at" | "client" | "plan">;
export type SaasSubscriptionUpdate = Partial<SaasSubscriptionInsert>;

// ---- Company Expenses (plantillas/recurrentes) ----
export type ExpenseInterval = "one_off" | "monthly" | "yearly" | "quarterly";
export type ExpenseCategory =
  | "SaaS"
  | "Infra"
  | "Marketing"
  | "Legal"
  | "Operaciones"
  | "Equipo"
  | "Otro";
export type ExpenseStatus = "active" | "paused" | "cancelled";
export type PaymentMethod = "card" | "transfer" | "direct_debit" | "cash" | "otro";

export interface CompanyExpense {
  id: string;
  vendor_id: string | null;
  name: string;
  category: ExpenseCategory | null;
  amount: number;
  currency: Currency;
  interval: ExpenseInterval;
  billing_day: number | null;  // 1-28, para recurrentes
  billing_date: string | null; // para one_off o anual con fecha exacta
  start_date: string | null;
  end_date: string | null;
  payment_method: PaymentMethod | null;
  status: ExpenseStatus;
  project_id: string | null;
  notes: string | null;
  created_at: string;
  // Relaciones
  vendor?: Vendor;
  project?: Project;
}

export type CompanyExpenseInsert = Omit<CompanyExpense, "id" | "created_at" | "vendor" | "project">;
export type CompanyExpenseUpdate = Partial<CompanyExpenseInsert>;

// ---- Expense Transactions (pagos reales) ----
export type TransactionStatus = "paid" | "pending";

export interface ExpenseTransaction {
  id: string;
  company_expense_id: string | null;
  vendor_id: string | null;
  project_id: string | null;
  name: string;
  category: ExpenseCategory | null;
  amount: number;
  currency: Currency;
  date: string;
  status: TransactionStatus;
  payment_method: PaymentMethod | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  // Relaciones
  vendor?: Vendor;
  project?: Project;
  company_expense?: CompanyExpense;
  tags?: Tag[];
}

export type ExpenseTransactionInsert = Omit<
  ExpenseTransaction,
  "id" | "created_at" | "vendor" | "project" | "company_expense" | "tags"
>;
export type ExpenseTransactionUpdate = Partial<ExpenseTransactionInsert>;

// ---- Invoices (facturas emitidas) ----
export type InvoiceStatus = "pending" | "sent" | "paid" | "overdue" | "cancelled";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export interface Invoice {
  id: string;
  project_id: string | null;
  client_id: string | null;
  invoice_number: string;
  concept: string;
  amount: number;
  tax_rate: number;
  irpf_rate: number;
  total: number; // generado: amount + IVA - IRPF
  currency: Currency;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  payment_method: PaymentMethod | null;
  notes: string | null;
  items?: InvoiceItem[];
  converted_from_quote_id?: string | null;
  client_address?: string | null;
  client_tax_id?: string | null;
  created_at: string;
  // Relaciones
  client?: Client;
  project?: Project;
}

export type InvoiceInsert = Omit<Invoice, "id" | "created_at" | "total" | "client" | "project">;
export type InvoiceUpdate = Partial<InvoiceInsert>;

// ---- Quotes (presupuestos) ----
export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "invoiced";

export interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export interface Quote {
  id: string;
  user_id: string;
  quote_number: string;
  status: QuoteStatus;
  potential_client_name?: string | null;
  potential_client_email?: string | null;
  potential_client_company?: string | null;
  potential_client_tax_id?: string | null;
  potential_client_address?: string | null;
  client_id?: string | null;
  concept: string;
  items: QuoteItem[];
  amount: number;
  tax_rate: number;
  irpf_rate: number;
  total: number;
  currency: Currency;
  issue_date: string;
  valid_until?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  converted_to_invoice_id?: string | null;
  created_at: string;
  updated_at: string;
  client?: Client | null;
}

export type QuoteInsert = Omit<Quote, "id" | "created_at" | "updated_at" | "client">;
export type QuoteUpdate = Partial<QuoteInsert>;

// ---- Income Transactions (cobros reales) ----
export interface IncomeTransaction {
  id: string;
  invoice_id: string | null;
  project_id: string | null;
  client_id: string | null;
  concept: string;
  amount: number;
  currency: Currency;
  date: string;
  payment_method: PaymentMethod | null;
  notes: string | null;
  is_manual: boolean;
  created_at: string;
  // Relaciones
  invoice?: Invoice;
  client?: Client;
  project?: Project;
}

export type IncomeTransactionInsert = Omit<
  IncomeTransaction,
  "id" | "created_at" | "invoice" | "client" | "project"
>;

export type IncomeTransactionUpdate = Partial<IncomeTransactionInsert>;

// ---- Tags ----
export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export type TagInsert = Omit<Tag, "id">;

// ---- Expense Tags (relación M:N) ----
export interface ExpenseTag {
  expense_transaction_id: string;
  tag_id: string;
}

// ============================================================
// Tipos de UI y lógica de negocio
// ============================================================

// Evento del calendario unificado
export type CalendarEventType = "payment" | "income" | "paid_payment" | "paid_income";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  amount: number;
  currency: Currency;
  date: string;
  status: string;
  sourceId: string; // ID del registro original
  sourceType:
    | "company_expense"
    | "invoice"
    | "expense_transaction"
    | "income_transaction"
    | "mensualidad"
    | "mensualidad_payment";
}

// Datos de cashflow mensual
export interface CashflowMonth {
  month: string; // "2024-01"
  label: string; // "Ene 2024"
  incomeExpected: number;
  incomeReal: number;
  expenseExpected: number;
  expenseReal: number;
  netExpected: number;
  netReal: number;
}

// Stats del dashboard
export interface DashboardStats {
  incomeThisMonth: { expected: number; real: number };
  expenseThisMonth: { expected: number; real: number };
  netThisMonth: { expected: number; real: number };
  overdueInvoices: Invoice[];
  upcomingPayments: CalendarEvent[];
  cashflowMonths: CashflowMonth[];
}

// Resultado de Server Action
export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// Filtros de gastos
export interface ExpenseFilters {
  category?: ExpenseCategory | "all";
  status?: ExpenseStatus | "all";
  project_id?: string | "all";
  tag_id?: string | "all";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Filtros de facturas
export interface InvoiceFilters {
  status?: InvoiceStatus | "all";
  client_id?: string | "all";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}
