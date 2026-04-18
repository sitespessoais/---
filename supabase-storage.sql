-- Storage: bucket magens + policies (corrige upload 403 / RLS).
-- SQL Editor → cole tudo → Run. Pode rodar de novo (idempotente).

INSERT INTO storage.buckets (id, name, public)
VALUES ('magens', 'magens', true)
ON CONFLICT (id) DO UPDATE SET public = excluded.public;

-- Remove policies antigas com estes nomes
DROP POLICY IF EXISTS "magens_read" ON storage.objects;
DROP POLICY IF EXISTS "magens_write" ON storage.objects;
DROP POLICY IF EXISTS "magens_update" ON storage.objects;
DROP POLICY IF EXISTS "magens_delete" ON storage.objects;
DROP POLICY IF EXISTS "magens_public_select" ON storage.objects;
DROP POLICY IF EXISTS "magens_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "magens_public_update" ON storage.objects;
DROP POLICY IF EXISTS "magens_public_delete" ON storage.objects;

-- Sem "TO anon": no Postgres isso vale para PUBLIC (inclui o papel anon do JWT).
-- Restringe tudo ao bucket_id = magens (não abre outros buckets).
CREATE POLICY "magens_public_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'magens');

CREATE POLICY "magens_public_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'magens');

CREATE POLICY "magens_public_update" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'magens')
  WITH CHECK (bucket_id = 'magens');

CREATE POLICY "magens_public_delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'magens');
