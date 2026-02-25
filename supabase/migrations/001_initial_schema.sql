-- ============================================================
-- GneraiHub — Migración inicial del esquema
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: vendors (proveedores/servicios externos)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  category_default text,
  website      text,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- TABLA: clients (clientes de Gnerai)
-- ============================================================
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

-- ============================================================
-- TABLA: projects (proyectos para clientes)
-- ============================================================
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

-- Índices para proyectos
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ============================================================
-- TABLA: company_expenses (plantillas de gastos — recurrentes o previstos)
-- ============================================================
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

-- Índices para company_expenses
CREATE INDEX IF NOT EXISTS idx_company_expenses_status ON company_expenses(status);
CREATE INDEX IF NOT EXISTS idx_company_expenses_interval ON company_expenses(interval);
CREATE INDEX IF NOT EXISTS idx_company_expenses_project_id ON company_expenses(project_id);

-- ============================================================
-- TABLA: expense_transactions (lo realmente pagado)
-- ============================================================
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

-- Índices para expense_transactions
CREATE INDEX IF NOT EXISTS idx_expense_transactions_date ON expense_transactions(date);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_status ON expense_transactions(status);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_project_id ON expense_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_company_expense_id ON expense_transactions(company_expense_id);

-- ============================================================
-- TABLA: invoices (facturas emitidas a clientes)
-- ============================================================
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

-- Índices para invoices
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- ============================================================
-- TABLA: income_transactions (cobros reales recibidos)
-- ============================================================
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

-- Índices para income_transactions
CREATE INDEX IF NOT EXISTS idx_income_transactions_date ON income_transactions(date);
CREATE INDEX IF NOT EXISTS idx_income_transactions_client_id ON income_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_project_id ON income_transactions(project_id);

-- ============================================================
-- TABLA: tags (etiquetas para gastos)
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL UNIQUE,
  color text
);

-- ============================================================
-- TABLA: expense_tags (relación M:N gastos ↔ tags)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_tags (
  expense_transaction_id uuid REFERENCES expense_transactions(id) ON DELETE CASCADE,
  tag_id                 uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_transaction_id, tag_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Habilitar RLS en todas las tablas — solo usuarios autenticados
-- ============================================================

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_tags ENABLE ROW LEVEL SECURITY;

-- Políticas: solo usuarios autenticados pueden acceder
-- (app interna — todos los usuarios autenticados tienen acceso total)

CREATE POLICY "Authenticated users can read vendors"
  ON vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write vendors"
  ON vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read clients"
  ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write clients"
  ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read projects"
  ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write projects"
  ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read company_expenses"
  ON company_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write company_expenses"
  ON company_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read expense_transactions"
  ON expense_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write expense_transactions"
  ON expense_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read invoices"
  ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write invoices"
  ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read income_transactions"
  ON income_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write income_transactions"
  ON income_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read tags"
  ON tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write tags"
  ON tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read expense_tags"
  ON expense_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write expense_tags"
  ON expense_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- DATOS SEMILLA — Categorías/tags iniciales
-- ============================================================

INSERT INTO tags (name, color) VALUES
  ('recurrente', '#7c3aed'),
  ('prioritario', '#ef4444'),
  ('revisión', '#f59e0b'),
  ('ahorro', '#10b981')
ON CONFLICT (name) DO NOTHING;

-- Vendors de ejemplo para Gnerai
INSERT INTO vendors (name, category_default, website) VALUES
  ('Vercel', 'Infra', 'https://vercel.com'),
  ('DigitalOcean', 'Infra', 'https://digitalocean.com'),
  ('Supabase', 'Infra', 'https://supabase.com'),
  ('GitHub', 'SaaS', 'https://github.com'),
  ('Notion', 'SaaS', 'https://notion.so'),
  ('Linear', 'SaaS', 'https://linear.app'),
  ('Google Workspace', 'SaaS', 'https://workspace.google.com'),
  ('Figma', 'SaaS', 'https://figma.com'),
  ('Stripe', 'Infra', 'https://stripe.com'),
  ('Cloudflare', 'Infra', 'https://cloudflare.com')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STORAGE: bucket para recibos/facturas adjuntas
-- (ejecutar por separado en Supabase Storage si es necesario)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('receipts', 'receipts', false)
-- ON CONFLICT (id) DO NOTHING;
