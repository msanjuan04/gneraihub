-- ============================================================
-- GneraiHub — Suscripciones SaaS con opción cliente gratis
-- ============================================================

ALTER TABLE saas_subscriptions
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;
