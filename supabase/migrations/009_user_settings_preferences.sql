-- ============================================================
-- GneraiHub — Ajustes de usuario / empresa
-- ============================================================

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  company_name text,
  company_tax_id text,
  company_address text,
  company_email text,
  company_phone text,
  company_logo_url text,
  accent_color text DEFAULT '#3b82f6',
  document_language text DEFAULT 'es',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_tax_id text,
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS company_email text,
  ADD COLUMN IF NOT EXISTS company_phone text,
  ADD COLUMN IF NOT EXISTS company_logo_url text,
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS document_language text DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints
    WHERE constraint_name = 'user_settings_document_language_check'
  ) THEN
    ALTER TABLE user_settings
      ADD CONSTRAINT user_settings_document_language_check
      CHECK (document_language IN ('es', 'en'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON user_settings;
CREATE TRIGGER trg_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_settings'
      AND policyname = 'settings_own'
  ) THEN
    CREATE POLICY "settings_own"
      ON user_settings
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
