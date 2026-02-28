-- ============================================================
-- GneraiHub — Presupuestos + mejoras de facturas + ajustes empresa
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: quotes (presupuestos)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  quote_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'invoiced')),

  -- Cliente potencial (sandbox)
  potential_client_name text,
  potential_client_email text,
  potential_client_company text,
  potential_client_tax_id text,
  potential_client_address text,
  -- Referencia opcional a cliente real
  client_id uuid REFERENCES clients(id),

  -- Documento
  concept text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  amount numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 21 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  irpf_rate numeric NOT NULL DEFAULT 0 CHECK (irpf_rate >= 0 AND irpf_rate <= 100),
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),

  -- Fechas
  issue_date date NOT NULL DEFAULT current_date,
  valid_until date,

  -- Extras
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

-- ------------------------------------------------------------
-- Facturas: nuevas columnas para editor visual y trazabilidad
-- ------------------------------------------------------------
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS converted_from_quote_id uuid REFERENCES quotes(id);

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS client_address text;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS client_tax_id text;

CREATE INDEX IF NOT EXISTS idx_invoices_converted_from_quote_id
  ON invoices(converted_from_quote_id);

-- ------------------------------------------------------------
-- Tabla: user_settings (datos de empresa emisora)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Trigger común para updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quotes_updated_at ON quotes;
CREATE TRIGGER trg_quotes_updated_at
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON user_settings;
CREATE TRIGGER trg_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ------------------------------------------------------------
-- RLS: quotes (solo propietario)
-- ------------------------------------------------------------
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quotes"
  ON quotes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own quotes"
  ON quotes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotes"
  ON quotes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotes"
  ON quotes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- RLS: user_settings (solo propietario)
-- ------------------------------------------------------------
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own user_settings"
  ON user_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own user_settings"
  ON user_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user_settings"
  ON user_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own user_settings"
  ON user_settings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
