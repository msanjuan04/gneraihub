-- ============================================================
-- GneraiHub — Migración SaaS Projects
-- Añade soporte para proyectos de tipo SaaS con múltiples
-- clientes y planes de suscripción con tipos de facturación
-- ============================================================

-- Añadir is_saas a projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_saas boolean DEFAULT false;

-- ============================================================
-- TABLA: saas_plans (planes de suscripción por proyecto)
--
-- billing_type define cómo se factura:
--   monthly       → cuota mensual (fee/mes)
--   annual        → cuota anual (fee/año)
--   setup_monthly → pago único de setup + cuota mensual
--   setup_annual  → pago único de setup + cuota anual
-- ============================================================
CREATE TABLE IF NOT EXISTS saas_plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name         text NOT NULL,
  billing_type text NOT NULL DEFAULT 'monthly'
                   CHECK (billing_type IN ('monthly', 'annual', 'setup_monthly', 'setup_annual')),
  fee          numeric NOT NULL CHECK (fee >= 0),   -- cuota recurrente (mensual o anual)
  setup_fee    numeric CHECK (setup_fee >= 0),      -- pago único inicial (nullable)
  currency     text DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),
  description  text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_plans_project_id ON saas_plans(project_id);

-- ============================================================
-- TABLA: saas_subscriptions (clientes suscritos a un proyecto SaaS)
-- ============================================================
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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read saas_plans"
  ON saas_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write saas_plans"
  ON saas_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read saas_subscriptions"
  ON saas_subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write saas_subscriptions"
  ON saas_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
