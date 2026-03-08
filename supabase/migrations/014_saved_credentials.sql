-- ============================================================
-- GneraiHub — Accesos (correos y contraseñas por sitio)
-- Solo el usuario propietario puede ver/editar sus registros (RLS).
-- ============================================================

CREATE TABLE IF NOT EXISTS saved_credentials (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  site       text NOT NULL,
  email      text NOT NULL,
  password   text NOT NULL,
  notes      text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_credentials_user_id ON saved_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_credentials_site ON saved_credentials(site);

ALTER TABLE saved_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own saved_credentials" ON saved_credentials;
DROP POLICY IF EXISTS "Users can insert own saved_credentials" ON saved_credentials;
DROP POLICY IF EXISTS "Users can update own saved_credentials" ON saved_credentials;
DROP POLICY IF EXISTS "Users can delete own saved_credentials" ON saved_credentials;

CREATE POLICY "Users can read own saved_credentials"
  ON saved_credentials FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved_credentials"
  ON saved_credentials FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved_credentials"
  ON saved_credentials FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved_credentials"
  ON saved_credentials FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_saved_credentials_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saved_credentials_updated_at ON saved_credentials;
CREATE TRIGGER trg_saved_credentials_updated_at
  BEFORE UPDATE ON saved_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_saved_credentials_updated_at();
