-- ============================================================
-- GneraiHub — Facturas: líneas de documento + trazabilidad quote
-- ============================================================

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
