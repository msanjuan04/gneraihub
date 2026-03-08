# Configuración en Supabase

## 1. Variables de entorno

En tu proyecto (`.env.local`) necesitas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key  # opcional, para acciones de servidor
```

Obtén los valores en: **Supabase Dashboard → Project Settings → API**.

---

## 2. Migraciones (base de datos + Storage)

### Opción A: Supabase CLI (recomendado)

Si usas Supabase local o enlazas el proyecto:

```bash
npx supabase db push
```

O, si aplicas migraciones una a una:

```bash
npx supabase migration up
```

### Opción B: Ejecutar SQL a mano en el SQL Editor

En **Supabase Dashboard → SQL Editor**, ejecuta las migraciones en este orden:

1. `001_initial_schema.sql`
2. `002_saas_projects.sql`
3. `003_mensualidades.sql`
4. `004_mensualidad_payments.sql`
5. `005_saas_subscriptions_free.sql`
6. `006_invoice_irpf.sql`
7. `007_quotes_documents_and_user_settings.sql`
8. `008_invoices_document_columns.sql`
9. `009_user_settings_preferences.sql`
10. `010_income_transactions_manual.sql`
11. `011_vendors_contact_fields.sql`
12. `012_logos_storage_bucket.sql`
13. **`013_receipts_storage_bucket.sql`** ← necesario para subir PDFs de facturas en Gastos

---

## 3. Bucket de Storage para recibos (PDFs de gastos)

Si **no** has ejecutado la migración `013_receipts_storage_bucket.sql`, puedes crear el bucket desde el dashboard:

### Crear bucket "receipts"

1. **Storage** → **New bucket**
2. **Name:** `receipts`
3. **Public bucket:** activado (para que las URLs de los PDFs funcionen)
4. Crear

### Políticas (Policies)

En el bucket `receipts` → **Policies** → **New policy** (o "RLS policies" y añadir):

- **SELECT (lectura):** todos pueden leer (público).
- **INSERT:** solo usuarios autenticados.
- **UPDATE / DELETE:** solo usuarios autenticados.

O ejecuta este SQL en el **SQL Editor** (equivale a la migración 013):

```sql
-- Bucket para facturas/recibos de gastos
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública (para ver el PDF desde la URL)
CREATE POLICY "receipts_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');

-- Escritura solo autenticados
CREATE POLICY "receipts_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "receipts_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'receipts')
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "receipts_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'receipts');
```

---

## 4. Bucket "logos" (logos de empresa en Ajustes)

Si no existe el bucket `logos`, créalo igual que `receipts`:

- **Name:** `logos`
- **Public:** sí  
O ejecuta la migración `012_logos_storage_bucket.sql`.

---

## 5. Resumen rápido

| Qué | Dónde / Cómo |
|-----|----------------|
| URL y Anon Key | Project Settings → API → copiar a `.env.local` |
| Migraciones DB | SQL Editor (pegando cada `.sql`) o `supabase db push` |
| Bucket `receipts` | Migración 013 o SQL de la sección 3 |
| Bucket `logos` | Migración 012 o crear bucket público `logos` |
| RLS | Ya definido en las migraciones; no hace falta tocar nada si aplicas todas |

---

## 6. Comprobar que todo está bien

1. **Authentication:** que Auth esté habilitado (Email, etc.) si usas login.
2. **Storage:** en Storage deben aparecer los buckets `receipts` y `logos`.
3. **API:** que la URL del proyecto y la anon key sean las de `.env.local`.

Si algo falla al subir un PDF en Gastos, revisa que el bucket `receipts` exista y sea público y que las políticas de Storage estén aplicadas.
