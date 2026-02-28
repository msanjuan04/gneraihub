-- ============================================================
-- GneraiHub — income_transactions manuales
-- ============================================================

ALTER TABLE income_transactions
  ADD COLUMN IF NOT EXISTS is_manual boolean DEFAULT false;

ALTER TABLE income_transactions
  ADD COLUMN IF NOT EXISTS concept text;

UPDATE income_transactions
SET is_manual = false
WHERE is_manual IS NULL;

ALTER TABLE income_transactions
  ALTER COLUMN is_manual SET DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_income_transactions_is_manual
  ON income_transactions(is_manual);
