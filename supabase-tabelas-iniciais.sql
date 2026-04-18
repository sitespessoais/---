-- Projeto NOVO (sem tabelas ainda): rode isto uma vez no SQL Editor.
-- Se você já rodou isso antes, não precisa de novo.

CREATE TABLE IF NOT EXISTS public.album_entries (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  description text DEFAULT '',
  date date NOT NULL,
  location text DEFAULT '',
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.album_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "album_select" ON public.album_entries;
DROP POLICY IF EXISTS "album_insert" ON public.album_entries;
DROP POLICY IF EXISTS "album_update" ON public.album_entries;
DROP POLICY IF EXISTS "album_delete" ON public.album_entries;

CREATE POLICY "album_select" ON public.album_entries FOR SELECT USING (true);
CREATE POLICY "album_insert" ON public.album_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "album_update" ON public.album_entries FOR UPDATE USING (true);
CREATE POLICY "album_delete" ON public.album_entries FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.keepalive_ping (
  id text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.keepalive_ping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ping_select" ON public.keepalive_ping;
DROP POLICY IF EXISTS "ping_insert" ON public.keepalive_ping;
DROP POLICY IF EXISTS "ping_delete" ON public.keepalive_ping;

CREATE POLICY "ping_select" ON public.keepalive_ping FOR SELECT USING (true);
CREATE POLICY "ping_insert" ON public.keepalive_ping FOR INSERT WITH CHECK (true);
CREATE POLICY "ping_delete" ON public.keepalive_ping FOR DELETE USING (true);
