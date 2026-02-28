-- ============================================================
-- GneraiHub — Proveedores: datos de contacto/fiscal
-- ============================================================

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS address text;
