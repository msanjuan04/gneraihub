-- ============================================================
-- GneraiHub — Cobros reales de mensualidades
-- ============================================================

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

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_mensualidad_payments_mensualidad_id
  ON mensualidad_payments(mensualidad_id);
CREATE INDEX IF NOT EXISTS idx_mensualidad_payments_client_id
  ON mensualidad_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_mensualidad_payments_project_id
  ON mensualidad_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_mensualidad_payments_payment_date
  ON mensualidad_payments(payment_date);

-- Solo puede existir un setup cobrado por mensualidad
CREATE UNIQUE INDEX IF NOT EXISTS idx_mensualidad_payments_one_setup
  ON mensualidad_payments(mensualidad_id)
  WHERE is_setup = true;

-- RLS
ALTER TABLE mensualidad_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mensualidad_payments"
  ON mensualidad_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write mensualidad_payments"
  ON mensualidad_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
