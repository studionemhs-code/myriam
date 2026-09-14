-- Playlists privadas de orações, itens e sessões (histórico) com RLS por usuário.

-- ===== prayer_playlists =====
CREATE TABLE IF NOT EXISTS prayer_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0
);
ALTER TABLE prayer_playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prayer_playlists_owner_all ON prayer_playlists;
CREATE POLICY prayer_playlists_owner_all ON prayer_playlists
  FOR ALL USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

-- ===== prayer_playlist_items =====
CREATE TABLE IF NOT EXISTS prayer_playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  playlist_id uuid REFERENCES prayer_playlists(id) ON DELETE CASCADE,
  prayer_id text NOT NULL,
  prayer_title text,
  prayer_audio_url text,
  prayer_cover_url text,
  sort_order integer DEFAULT 0
);
ALTER TABLE prayer_playlist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prayer_playlist_items_owner_all ON prayer_playlist_items;
CREATE POLICY prayer_playlist_items_owner_all ON prayer_playlist_items
  FOR ALL USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

-- ===== prayer_sessions (histórico de orações concluídas) =====
CREATE TABLE IF NOT EXISTS prayer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  prayer_id text NOT NULL,
  prayer_title text,
  source text DEFAULT 'oracoes',
  completed_at timestamptz DEFAULT now(),
  duration_seconds integer DEFAULT 0
);
ALTER TABLE prayer_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prayer_sessions_owner_read ON prayer_sessions;
CREATE POLICY prayer_sessions_owner_read ON prayer_sessions
  FOR SELECT USING (
    created_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS prayer_sessions_owner_insert ON prayer_sessions;
CREATE POLICY prayer_sessions_owner_insert ON prayer_sessions
  FOR INSERT WITH CHECK (created_by_id = auth.uid());
DROP POLICY IF EXISTS prayer_sessions_owner_delete ON prayer_sessions;
CREATE POLICY prayer_sessions_owner_delete ON prayer_sessions
  FOR DELETE USING (created_by_id = auth.uid());