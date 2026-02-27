-- ============================================================
-- GneraiHub — IRPF en facturas (retención que se resta)
-- ============================================================

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS irpf_rate numeric NOT NULL DEFAULT 0
  CHECK (irpf_rate >= 0 AND irpf_rate <= 100);

-- Recalcular columna generada total incluyendo IRPF
ALTER TABLE invoices
  DROP COLUMN IF EXISTS total;

ALTER TABLE invoices
  ADD COLUMN total numeric
  GENERATED ALWAYS AS (
    amount
    + amount * tax_rate / 100
    - amount * irpf_rate / 100
  ) STORED;
