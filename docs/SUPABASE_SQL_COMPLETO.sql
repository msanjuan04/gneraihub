-- =============================================================================
-- GneraiHub — Todo el SQL para Supabase (sin CLI)
-- Ejecuta cada bloque en el SQL Editor en orden: 1 → 2 → 3 → ... → 13
-- https://supabase.com/dashboard → Tu proyecto → SQL Editor → New query
-- =============================================================================


-- ############################################################################
-- BLOQUE 1 — Esquema inicial (tablas, índices, RLS, datos semilla)
-- ############################################################################

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS vendors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  category_default text,
  website      text,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text,
  phone      text,
  company    text,
  nif        text,
  address    text,
  notes      text,
  status     text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid REFERENCES clients(id) ON DELETE SET NULL,
  name        text NOT NULL,
  description text,
  status      text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  type        text CHECK (type IN ('web', 'app', 'marketing', 'consulting', 'ecommerce', 'otro')),
  budget      numeric,
  currency    text DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),
  start_date  date,
  end_date    date,
  notes       text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS company_expenses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id      uuid REFERENCES vendors(id) ON DELETE SET NULL,
  name           text NOT NULL,
  category       text CHECK (category IN ('SaaS', 'Infra', 'Marketing', 'Legal', 'Operaciones', 'Equipo', 'Otro')),
  amount         numeric NOT NULL CHECK (amount > 0),
  currency       text DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),
  interval       text NOT NULL CHECK (interval IN ('one_off', 'monthly', 'yearly', 'quarterly')),
  billing_day    integer CHECK (billing_day BETWEEN 1 AND 28),
  billing_date   date,
  start_date     date,
  end_date       date,
  payment_method text CHECK (payment_method IN ('card', 'transfer', 'direct_debit', 'cash', 'otro')),
  status         text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  project_id     uuid REFERENCES projects(id) ON DELETE SET NULL,
  notes          text,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_expenses_status ON company_expenses(status);
CREATE INDEX IF NOT EXISTS idx_company_expenses_interval ON company_expenses(interval);
CREATE INDEX IF NOT EXISTS idx_company_expenses_project_id ON company_expenses(project_id);

CREATE TABLE IF NOT EXISTS expense_transactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_expense_id  uuid REFERENCES company_expenses(id) ON DELETE SET NULL,
  vendor_id           uuid REFERENCES vendors(id) ON DELETE SET NULL,
  project_id          uuid REFERENCES projects(id) ON DELETE SET NULL,
  name                text NOT NULL,
  category            text CHECK (category IN ('SaaS', 'Infra', 'Marketing', 'Legal', 'Operaciones', 'Equipo', 'Otro')),
  amount              numeric NOT NULL CHECK (amount > 0),
  currency            text DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),
  date                date NOT NULL,
  status              text DEFAULT 'paid' CHECK (status IN ('paid', 'pending')),
  payment_method      text CHECK (payment_method IN ('card', 'transfer', 'direct_debit', 'cash', 'otro')),
  receipt_url         text,
  notes               text,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_transactions_date ON expense_transactions(date);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_status ON expense_transactions(status);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_project_id ON expense_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_company_expense_id ON expense_transactions(company_expense_id);

CREATE TABLE IF NOT EXISTS invoices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid REFERENCES projects(id) ON DELETE SET NULL,
  client_id      uuid REFERENCES clients(id) ON DELETE SET NULL,
  invoice_number text NOT NULL UNIQUE,
  concept        text NOT NULL,
  amount         numeric NOT NULL CHECK (amount > 0),
  tax_rate       numeric DEFAULT 21 CHECK (tax_rate >= 0),
  total          numeric GENERATED ALWAYS AS (amount + amount * tax_rate / 100) STORED,
  currency       text DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),
  issue_date     date NOT NULL,
  due_date       date NOT NULL,
  status         text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_method text CHECK (payment_method IN ('card', 'transfer', 'direct_debit', 'cash', 'otro')),
  notes          text,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE TABLE IF NOT EXISTS income_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     uuid REFERENCES invoices(id) ON DELETE SET NULL,
  project_id     uuid REFERENCES projects(id) ON DELETE SET NULL,
  client_id      uuid REFERENCES clients(id) ON DELETE SET NULL,
  concept        text NOT NULL,
  amount         numeric NOT NULL CHECK (amount > 0),
  currency       text DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),
  date           date NOT NULL,
  payment_method text CHECK (payment_method IN ('card', 'transfer', 'direct_debit', 'cash', 'otro')),
  notes          text,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_income_transactions_date ON income_transactions(date);
CREATE INDEX IF NOT EXISTS idx_income_transactions_client_id ON income_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_project_id ON income_transactions(project_id);

CREATE TABLE IF NOT EXISTS tags (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL UNIQUE,
  color text
);

CREATE TABLE IF NOT EXISTS expense_tags (
  expense_transaction_id uuid REFERENCES expense_transactions(id) ON DELETE CASCADE,
  tag_id                 uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_transaction_id, tag_id)
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read vendors" ON vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write vendors" ON vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read clients" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read projects" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read company_expenses" ON company_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write company_expenses" ON company_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read expense_transactions" ON expense_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write expense_transactions" ON expense_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read invoices" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write invoices" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read income_transactions" ON income_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write income_transactions" ON income_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read tags" ON tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write tags" ON tags FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read expense_tags" ON expense_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write expense_tags" ON expense_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO tags (name, color) VALUES
  ('recurrente', '#7c3aed'),
  ('prioritario', '#ef4444'),
  ('revisión', '#f59e0b'),
  ('ahorro', '#10b981')
ON CONFLICT (name) DO NOTHING;


-- ############################################################################
-- BLOQUE 2 — SaaS (projects is_saas, saas_plans, saas_subscriptions)
-- ############################################################################

ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_saas boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS saas_plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name         text NOT NULL,
  billing_type text NOT NULL DEFAULT 'monthly'
    CHECK (billing_type IN ('monthly', 'annual', 'setup_monthly', 'setup_annual')),
  fee          numeric NOT NULL CHECK (fee >= 0),
  setup_fee    numeric CHECK (setup_fee >= 0),
  currency     text DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),
  description  text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_plans_project_id ON saas_plans(project_id);

CREATE TABLE IF NOT EXISTS saas_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  client_id   uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  plan_id     uuid REFERENCES saas_plans(id) ON DELETE SET NULL,
  status      text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  start_date  date,
  end_date    date,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(project_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_project_id ON saas_subscriptions(project_id);
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_client_id ON saas_subscriptions(client_id);

ALTER TABLE saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read saas_plans" ON saas_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write saas_plans" ON saas_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read saas_subscriptions" ON saas_subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write saas_subscriptions" ON saas_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ############################################################################
-- BLOQUE 3 — Mensualidades
-- ############################################################################

CREATE TABLE IF NOT EXISTS mensualidades (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  project_id   uuid REFERENCES projects(id) ON DELETE SET NULL,
  name         text NOT NULL,
  billing_type text NOT NULL DEFAULT 'monthly'
    CHECK (billing_type IN ('monthly', 'annual', 'setup_monthly', 'setup_annual')),
  fee          numeric NOT NULL CHECK (fee >= 0),
  setup_fee    numeric CHECK (setup_fee >= 0),
  currency     text DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),
  status       text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  start_date   date,
  end_date     date,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensualidades_client_id ON mensualidades(client_id);
CREATE INDEX IF NOT EXISTS idx_mensualidades_project_id ON mensualidades(project_id);
CREATE INDEX IF NOT EXISTS idx_mensualidades_status ON mensualidades(status);

ALTER TABLE mensualidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mensualidades" ON mensualidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write mensualidades" ON mensualidades FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ############################################################################
-- BLOQUE 4 — Mensualidad payments
-- ############################################################################

CREATE TABLE IF NOT EXISTS mensualidad_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensualidad_id uuid REFERENCES mensualidades(id) ON DELETE CASCADE NOT NULL,
  client_id      uuid REFERENCES clients(id) ON DELETE SET NULL,
  project_id     uuid REFERENCES projects(id) ON DELETE SET NULL,
  payment_date   date NOT NULL,
  amount         numeric NOT NULL CHECK (amount > 0),
  currency       text DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),
  payment_method text CHECK (payment_method IN ('card', 'transfer', 'direct_debit', 'cash', 'otro')),
  is_setup       boolean DEFAULT false,
  notes          text,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensualidad_payments_mensualidad_id ON mensualidad_payments(mensualidad_id);
CREATE INDEX IF NOT EXISTS idx_mensualidad_payments_client_id ON mensualidad_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_mensualidad_payments_project_id ON mensualidad_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_mensualidad_payments_payment_date ON mensualidad_payments(payment_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mensualidad_payments_one_setup
  ON mensualidad_payments(mensualidad_id) WHERE is_setup = true;

ALTER TABLE mensualidad_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mensualidad_payments" ON mensualidad_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write mensualidad_payments" ON mensualidad_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ############################################################################
-- BLOQUE 5 — SaaS subscriptions is_free
-- ############################################################################

ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;


-- ############################################################################
-- BLOQUE 6 — Facturas: IRPF y total recalculado
-- ############################################################################

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS irpf_rate numeric NOT NULL DEFAULT 0
  CHECK (irpf_rate >= 0 AND irpf_rate <= 100);

ALTER TABLE invoices DROP COLUMN IF EXISTS total;

ALTER TABLE invoices ADD COLUMN total numeric
  GENERATED ALWAYS AS (
    amount + amount * tax_rate / 100 - amount * irpf_rate / 100
  ) STORED;


-- ############################################################################
-- BLOQUE 7 — Presupuestos (quotes), facturas (items, quote), user_settings
-- ############################################################################

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  quote_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'invoiced')),
  potential_client_name text,
  potential_client_email text,
  potential_client_company text,
  potential_client_tax_id text,
  potential_client_address text,
  client_id uuid REFERENCES clients(id),
  concept text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  amount numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 21 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  irpf_rate numeric NOT NULL DEFAULT 0 CHECK (irpf_rate >= 0 AND irpf_rate <= 100),
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),
  issue_date date NOT NULL DEFAULT current_date,
  valid_until date,
  notes text,
  internal_notes text,
  converted_to_invoice_id uuid REFERENCES invoices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_issue_date ON quotes(issue_date);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_invoice_id ON quotes(converted_to_invoice_id);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS converted_from_quote_id uuid REFERENCES quotes(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_address text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_tax_id text;

CREATE INDEX IF NOT EXISTS idx_invoices_converted_from_quote_id ON invoices(converted_from_quote_id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  company_name text,
  company_tax_id text,
  company_address text,
  company_email text,
  company_phone text,
  company_logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quotes_updated_at ON quotes;
CREATE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON user_settings;
CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quotes" ON quotes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own quotes" ON quotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quotes" ON quotes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own quotes" ON quotes FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own user_settings" ON user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own user_settings" ON user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own user_settings" ON user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own user_settings" ON user_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- ############################################################################
-- BLOQUE 8 — Facturas: columnas document (por si no existen)
-- ############################################################################

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS converted_from_quote_id uuid REFERENCES quotes(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_address text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_tax_id text;

CREATE INDEX IF NOT EXISTS idx_invoices_converted_from_quote_id ON invoices(converted_from_quote_id);


-- ############################################################################
-- BLOQUE 9 — User settings: accent_color, document_language
-- ############################################################################

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  company_name text,
  company_tax_id text,
  company_address text,
  company_email text,
  company_phone text,
  company_logo_url text,
  accent_color text DEFAULT '#3b82f6',
  document_language text DEFAULT 'es',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS document_language text DEFAULT 'es';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'user_settings_document_language_check'
  ) THEN
    ALTER TABLE user_settings
      ADD CONSTRAINT user_settings_document_language_check
      CHECK (document_language IN ('es', 'en'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON user_settings;
CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'settings_own'
  ) THEN
    CREATE POLICY "settings_own" ON user_settings FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ############################################################################
-- BLOQUE 10 — Income transactions: is_manual, concept
-- ############################################################################

ALTER TABLE income_transactions ADD COLUMN IF NOT EXISTS is_manual boolean DEFAULT false;
ALTER TABLE income_transactions ADD COLUMN IF NOT EXISTS concept text;

UPDATE income_transactions SET is_manual = false WHERE is_manual IS NULL;

ALTER TABLE income_transactions ALTER COLUMN is_manual SET DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_income_transactions_is_manual ON income_transactions(is_manual);


-- ############################################################################
-- BLOQUE 11 — Vendors: email, phone, tax_id, address
-- ############################################################################

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS address text;


-- ############################################################################
-- BLOQUE 12 — Storage: bucket logos
-- ############################################################################

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'logos_public_read'
  ) THEN
    CREATE POLICY "logos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'logos_authenticated_insert'
  ) THEN
    CREATE POLICY "logos_authenticated_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'logos_authenticated_update'
  ) THEN
    CREATE POLICY "logos_authenticated_update" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'logos') WITH CHECK (bucket_id = 'logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'logos_authenticated_delete'
  ) THEN
    CREATE POLICY "logos_authenticated_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos');
  END IF;
END $$;


-- ############################################################################
-- BLOQUE 13 — Storage: bucket receipts (PDFs de gastos)
-- ############################################################################

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'receipts_public_read'
  ) THEN
    CREATE POLICY "receipts_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'receipts_authenticated_insert'
  ) THEN
    CREATE POLICY "receipts_authenticated_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'receipts_authenticated_update'
  ) THEN
    CREATE POLICY "receipts_authenticated_update" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'receipts') WITH CHECK (bucket_id = 'receipts');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'receipts_authenticated_delete'
  ) THEN
    CREATE POLICY "receipts_authenticated_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'receipts');
  END IF;
END $$;
