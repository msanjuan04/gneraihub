-- ============================================================
-- GneraiHub — Storage bucket para logos de empresa
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'logos_public_read'
  ) THEN
    CREATE POLICY "logos_public_read"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'logos_authenticated_insert'
  ) THEN
    CREATE POLICY "logos_authenticated_insert"
      ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'logos_authenticated_update'
  ) THEN
    CREATE POLICY "logos_authenticated_update"
      ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'logos')
      WITH CHECK (bucket_id = 'logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'logos_authenticated_delete'
  ) THEN
    CREATE POLICY "logos_authenticated_delete"
      ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'logos');
  END IF;
END $$;
