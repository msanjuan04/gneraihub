-- ============================================================
-- GneraiHub — Storage bucket para facturas/recibos de gastos
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'receipts_public_read'
  ) THEN
    CREATE POLICY "receipts_public_read"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'receipts');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'receipts_authenticated_insert'
  ) THEN
    CREATE POLICY "receipts_authenticated_insert"
      ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'receipts');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'receipts_authenticated_update'
  ) THEN
    CREATE POLICY "receipts_authenticated_update"
      ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'receipts')
      WITH CHECK (bucket_id = 'receipts');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'receipts_authenticated_delete'
  ) THEN
    CREATE POLICY "receipts_authenticated_delete"
      ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'receipts');
  END IF;
END $$;
