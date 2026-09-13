-- ============================================================================
-- THEOTOKOS — Migração de Sincronização Total (Frontend × Banco × Edge Functions)
-- Idempotente e não destrutiva: pode ser executada quantas vezes for necessário.
-- Consolida artefatos criados manualmente no banco + corrige divergências da auditoria.
-- ============================================================================

-- ============================================================================
-- 1. ENUM ai_model — cobre todos os valores enviados pelo frontend (AgentEditor)
--    (ADD VALUE não pode rodar dentro de bloco transacional; executar direto)
-- ============================================================================
ALTER TYPE public.ai_model ADD VALUE IF NOT EXISTS 'automatic';
ALTER TYPE public.ai_model ADD VALUE IF NOT EXISTS 'gpt_5_mini';
ALTER TYPE public.ai_model ADD VALUE IF NOT EXISTS 'gpt_5_4';
ALTER TYPE public.ai_model ADD VALUE IF NOT EXISTS 'gpt_5_6_sol';
ALTER TYPE public.ai_model ADD VALUE IF NOT EXISTS 'gpt_5_6_luna';

-- ============================================================================
-- 2. COLUNAS FALTANTES
-- ============================================================================

-- profiles: token de push (Edge Function integrations → SendPushNotification)
--           e presença online (useTrackActivity → heartbeat)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token   TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- acamf_contents: paywall de reprodução em 2º plano / PiP e download offline
ALTER TABLE public.acamf_contents ADD COLUMN IF NOT EXISTS background_playback_type       TEXT NOT NULL DEFAULT 'gratuito';
ALTER TABLE public.acamf_contents ADD COLUMN IF NOT EXISTS background_playback_product_id TEXT;
ALTER TABLE public.acamf_contents ADD COLUMN IF NOT EXISTS offline_download_type          TEXT NOT NULL DEFAULT 'pago';
ALTER TABLE public.acamf_contents ADD COLUMN IF NOT EXISTS offline_download_product_id    TEXT;

-- ============================================================================
-- 3. TABELAS DE CONFIGURAÇÃO (singletons) E ATIVIDADE DIÁRIA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.support_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date  TIMESTAMPTZ DEFAULT now(),
  updated_date  TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  whatsapp      TEXT,
  email         TEXT,
  phone         TEXT,
  site_url      TEXT,
  enabled       BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.greeting_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date         TIMESTAMPTZ DEFAULT now(),
  updated_date         TIMESTAMPTZ DEFAULT now(),
  created_by_id        UUID,
  greeting_interessado TEXT,
  greeting_preparacao  TEXT,
  greeting_consagrado  TEXT,
  quote_interessado    TEXT,
  quote_preparacao     TEXT,
  quote_consagrado     TEXT
);

CREATE TABLE IF NOT EXISTS public.personalization_settings (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date           TIMESTAMPTZ DEFAULT now(),
  updated_date           TIMESTAMPTZ DEFAULT now(),
  created_by_id          UUID,
  level_interessado_name TEXT,
  level_interessado_desc TEXT,
  level_preparacao_name  TEXT,
  level_preparacao_desc  TEXT,
  level_consagrado_name  TEXT,
  level_consagrado_desc  TEXT,
  splash_video_url       TEXT,
  login_bg_desktop       TEXT,
  login_bg_mobile        TEXT,
  favicon_url            TEXT
);

-- Um registro por usuário por dia (upsert com onConflict created_by_id,day)
CREATE TABLE IF NOT EXISTS public.daily_activity (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_date  TIMESTAMPTZ DEFAULT now(),
  updated_date  TIMESTAMPTZ DEFAULT now(),
  created_by_id TEXT,
  day           DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date
);

DO $$ BEGIN
  ALTER TABLE public.daily_activity ADD CONSTRAINT daily_activity_created_by_id_day_key UNIQUE (created_by_id, day);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_daily_activity_day ON public.daily_activity(day);

-- ============================================================================
-- 4. RLS DAS TABELAS ACIMA
-- ============================================================================
ALTER TABLE public.support_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.greeting_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity           ENABLE ROW LEVEL SECURITY;

-- Settings: leitura pública, escrita admin
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['support_settings','greeting_settings','personalization_settings'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_read" ON public.%s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_read_all" ON public.%s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_admin_insert" ON public.%s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_admin_update" ON public.%s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_admin_delete" ON public.%s', t, t);
    EXECUTE format('CREATE POLICY "%s_read"         ON public.%s FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY "%s_admin_insert" ON public.%s FOR INSERT WITH CHECK (is_admin())', t, t);
    EXECUTE format('CREATE POLICY "%s_admin_update" ON public.%s FOR UPDATE USING (is_admin()) WITH CHECK (is_admin())', t, t);
    EXECUTE format('CREATE POLICY "%s_admin_delete" ON public.%s FOR DELETE USING (is_admin())', t, t);
  END LOOP;
END $$;

-- daily_activity: próprio usuário (ou admin)
DROP POLICY IF EXISTS "daily_activity_select" ON public.daily_activity;
DROP POLICY IF EXISTS "daily_activity_insert" ON public.daily_activity;
DROP POLICY IF EXISTS "daily_activity_update" ON public.daily_activity;
DROP POLICY IF EXISTS "daily_activity_delete" ON public.daily_activity;
CREATE POLICY "daily_activity_select" ON public.daily_activity FOR SELECT USING (created_by_id = auth.uid()::text OR is_admin());
CREATE POLICY "daily_activity_insert" ON public.daily_activity FOR INSERT WITH CHECK (created_by_id = auth.uid()::text);
CREATE POLICY "daily_activity_update" ON public.daily_activity FOR UPDATE USING (created_by_id = auth.uid()::text OR is_admin());
CREATE POLICY "daily_activity_delete" ON public.daily_activity FOR DELETE USING (created_by_id = auth.uid()::text OR is_admin());

-- ============================================================================
-- 5. TRIGGERS (updated_date + created_by_id) — reaproveita funções existentes
-- ============================================================================

-- created_by_id em TEXT (daily_activity) precisa de uma variante da função
CREATE OR REPLACE FUNCTION public.set_created_by_text()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.created_by_id = auth.uid()::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove gatilhos legados (criados manualmente com outros nomes) para evitar duplicidade
DROP TRIGGER IF EXISTS greeting_settings_updated_date ON public.greeting_settings;
DROP TRIGGER IF EXISTS support_settings_updated ON public.support_settings;
DROP TRIGGER IF EXISTS personalization_settings_updated ON public.personalization_settings;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['support_settings','greeting_settings','personalization_settings'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_date_%s ON public.%s', t, t);
    EXECUTE format('CREATE TRIGGER set_updated_date_%s BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.update_updated_date()', t, t);
    EXECUTE format('DROP TRIGGER IF EXISTS set_created_by_%s ON public.%s', t, t);
    EXECUTE format('CREATE TRIGGER set_created_by_%s BEFORE INSERT ON public.%s FOR EACH ROW EXECUTE FUNCTION public.set_created_by()', t, t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS set_updated_date_daily_activity ON public.daily_activity;
CREATE TRIGGER set_updated_date_daily_activity BEFORE UPDATE ON public.daily_activity FOR EACH ROW EXECUTE FUNCTION public.update_updated_date();
DROP TRIGGER IF EXISTS trg_cb_daily_activity ON public.daily_activity;
DROP TRIGGER IF EXISTS set_created_by_daily_activity ON public.daily_activity;
CREATE TRIGGER set_created_by_daily_activity BEFORE INSERT ON public.daily_activity FOR EACH ROW EXECUTE FUNCTION public.set_created_by_text();

-- ============================================================================
-- 6. SEEDS DOS SINGLETONS (somente se vazios — preserva dados existentes)
-- ============================================================================
INSERT INTO public.support_settings (enabled)
SELECT true WHERE NOT EXISTS (SELECT 1 FROM public.support_settings);

INSERT INTO public.greeting_settings (greeting_interessado)
SELECT NULL WHERE NOT EXISTS (SELECT 1 FROM public.greeting_settings);

INSERT INTO public.personalization_settings (level_interessado_name)
SELECT NULL WHERE NOT EXISTS (SELECT 1 FROM public.personalization_settings);

-- ============================================================================
-- 7. RPCs
-- ============================================================================

-- Incremento atômico de visualizações (chamado pelo frontend em ACAMFDetalhe)
DROP FUNCTION IF EXISTS public.increment_view_count(uuid);
CREATE OR REPLACE FUNCTION public.increment_view_count(content_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_count INTEGER;
BEGIN
  UPDATE public.acamf_contents
     SET view_count = COALESCE(view_count, 0) + 1
   WHERE id = content_id
  RETURNING view_count INTO new_count;
  RETURN new_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO authenticated, service_role;

-- Descoberta dinâmica de tabelas por coluna (Edge Function delete-user)
CREATE OR REPLACE FUNCTION public.get_tables_by_column(column_name TEXT)
RETURNS SETOF TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.table_name::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.column_name = $1
  ORDER BY c.table_name;
$$;
GRANT EXECUTE ON FUNCTION public.get_tables_by_column(text) TO authenticated, service_role;

-- ============================================================================
-- 8. VALIDAÇÃO ESTRITA — CHECK constraints espelhando os enums das entidades
--    (limpeza defensiva com UPDATE antes de cada constraint; nunca DELETE)
-- ============================================================================

-- acamf_contents.background_playback_type ∈ {gratuito, pago}
UPDATE public.acamf_contents SET background_playback_type = 'gratuito'
 WHERE background_playback_type IS NULL OR background_playback_type NOT IN ('gratuito','pago');
ALTER TABLE public.acamf_contents DROP CONSTRAINT IF EXISTS acamf_contents_background_playback_type_check;
ALTER TABLE public.acamf_contents ADD CONSTRAINT acamf_contents_background_playback_type_check
  CHECK (background_playback_type IN ('gratuito','pago'));

-- acamf_contents.offline_download_type ∈ {gratuito, pago}
UPDATE public.acamf_contents SET offline_download_type = 'pago'
 WHERE offline_download_type IS NULL OR offline_download_type NOT IN ('gratuito','pago');
ALTER TABLE public.acamf_contents DROP CONSTRAINT IF EXISTS acamf_contents_offline_download_type_check;
ALTER TABLE public.acamf_contents ADD CONSTRAINT acamf_contents_offline_download_type_check
  CHECK (offline_download_type IN ('gratuito','pago'));

-- journey_contents.content_type ∈ {texto, pdf, audio, video, imagem}
UPDATE public.journey_contents SET content_type = 'texto'
 WHERE content_type IS NULL OR content_type NOT IN ('texto','pdf','audio','video','imagem');
ALTER TABLE public.journey_contents DROP CONSTRAINT IF EXISTS journey_contents_content_type_check;
ALTER TABLE public.journey_contents ADD CONSTRAINT journey_contents_content_type_check
  CHECK (content_type IN ('texto','pdf','audio','video','imagem'));

-- journey_participants.intent ∈ {primeira_consagracao, renovacao} (ou NULL)
UPDATE public.journey_participants SET intent = NULL
 WHERE intent IS NOT NULL AND intent NOT IN ('primeira_consagracao','renovacao');
ALTER TABLE public.journey_participants DROP CONSTRAINT IF EXISTS journey_participants_intent_check;
ALTER TABLE public.journey_participants ADD CONSTRAINT journey_participants_intent_check
  CHECK (intent IS NULL OR intent IN ('primeira_consagracao','renovacao'));

-- ai_agents.default_voice ∈ {river, honey, sunny, storm, spark}
UPDATE public.ai_agents SET default_voice = 'river'
 WHERE default_voice IS NULL OR default_voice NOT IN ('river','honey','sunny','storm','spark');
ALTER TABLE public.ai_agents DROP CONSTRAINT IF EXISTS ai_agents_default_voice_check;
ALTER TABLE public.ai_agents ADD CONSTRAINT ai_agents_default_voice_check
  CHECK (default_voice IN ('river','honey','sunny','storm','spark'));

-- ai_agents.tools_enabled ⊆ ferramentas conhecidas
UPDATE public.ai_agents SET tools_enabled = ARRAY(
  SELECT x FROM unnest(tools_enabled) x
  WHERE x IN ('calculator','web_search','system_query','get_preparation_day','list_acamf_content','list_prayers','get_active_journeys')
) WHERE tools_enabled IS NOT NULL;
ALTER TABLE public.ai_agents DROP CONSTRAINT IF EXISTS ai_agents_tools_enabled_check;
ALTER TABLE public.ai_agents ADD CONSTRAINT ai_agents_tools_enabled_check
  CHECK (tools_enabled <@ ARRAY['calculator','web_search','system_query','get_preparation_day','list_acamf_content','list_prayers','get_active_journeys']::text[]);

-- ============================================================================
-- FIM — Verificação sugerida:
--   SELECT unnest(enum_range(NULL::ai_model));
--   SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name IN ('push_token','last_seen_at');
--   SELECT proname FROM pg_proc WHERE proname IN ('increment_view_count','get_tables_by_column');
--   SELECT conname FROM pg_constraint WHERE conname LIKE '%_check' AND conrelid IN ('acamf_contents'::regclass,'journey_contents'::regclass,'journey_participants'::regclass,'ai_agents'::regclass);
-- ============================================================================