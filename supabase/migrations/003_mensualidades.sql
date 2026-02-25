-- ============================================================
-- GneraiHub — Migración Mensualidades
-- Facturación recurrente por cliente, vinculada opcionalmente
-- a un proyecto. Reemplaza el modelo saas_plans/saas_subscriptions.
--
-- Ventajas sobre el modelo anterior:
--   · client_id requerido — la mensualidad pertenece al cliente
--   · project_id OPCIONAL — no obliga a tener proyecto
--   · Cualquier proyecto puede tener mensualidades (no solo SaaS)
-- ============================================================

CREATE TABLE IF NOT EXISTS mensualidades (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quién paga (requerido)
  client_id    uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,

  -- A qué proyecto pertenece (opcional)
  project_id   uuid REFERENCES projects(id) ON DELETE SET NULL,

  -- Descripción de la mensualidad: "Mantenimiento web", "Plan Pro", "Retainer SEO"…
  name         text NOT NULL,

  -- Tipo de facturación
  billing_type text NOT NULL DEFAULT 'monthly'
                   CHECK (billing_type IN ('monthly', 'annual', 'setup_monthly', 'setup_annual')),

  fee          numeric NOT NULL CHECK (fee >= 0),    -- cuota recurrente
  setup_fee    numeric CHECK (setup_fee >= 0),       -- pago único inicial (nullable)

  currency     text DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),

  status       text DEFAULT 'active'
                   CHECK (status IN ('active', 'paused', 'cancelled')),

  start_date   date,
  end_date     date,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mensualidades_client_id  ON mensualidades(client_id);
CREATE INDEX IF NOT EXISTS idx_mensualidades_project_id ON mensualidades(project_id);
CREATE INDEX IF NOT EXISTS idx_mensualidades_status     ON mensualidades(status);

-- RLS
ALTER TABLE mensualidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mensualidades"
  ON mensualidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write mensualidades"
  ON mensualidades FOR ALL TO authenticated USING (true) WITH CHECK (true);
