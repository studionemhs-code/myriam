-- ============================================================================
-- THEOTOKOS — Migração Completa para Supabase
-- Script SQL com todas as tabelas, enums, RLS (Row Level Security), triggers e índices
-- 
-- INSTRUÇÕES:
-- 1. Crie um projeto no Supabase (https://supabase.com)
-- 2. Vá em SQL Editor → New query
-- 3. Cole este script inteiro e execute
-- 4. As tabelas serão criadas com RLS ativo e políticas espelhando o Base44
-- 
-- Total de entidades: 38 (incluindo User → profiles)
-- ============================================================================

-- ============================================================================
-- 1. EXTENSÕES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 2. ENUMS (Tipos customizados do PostgreSQL)
-- ============================================================================
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE user_status AS ENUM ('interessado', 'preparacao', 'consagrado');
CREATE TYPE content_type AS ENUM ('texto', 'pdf', 'ebook', 'audio', 'video', 'imagem');
CREATE TYPE content_level AS ENUM ('iniciante', 'intermediario', 'aprofundamento');
CREATE TYPE content_status AS ENUM ('rascunho', 'publicado', 'arquivado');
CREATE TYPE border_style AS ENUM ('classic', 'modern', 'minimal');
CREATE TYPE certificate_type AS ENUM ('preparacao', 'jornada', 'renovacao');
CREATE TYPE cert_signature_type AS ENUM ('typed', 'uploaded');
CREATE TYPE assoc_signature_type AS ENUM ('typed', 'drawn', 'uploaded');
CREATE TYPE chat_file_type AS ENUM ('image', 'video', 'audio', 'document');
CREATE TYPE journey_status AS ENUM ('rascunho', 'ativa', 'pausada', 'encerrada');
CREATE TYPE journey_type AS ENUM ('consagracao', 'renovacao');
CREATE TYPE calendar_event_type AS ENUM ('solenidade', 'festa', 'memoria', 'jornada', 'pessoal', 'evento');
CREATE TYPE prayer_category AS ENUM ('saude', 'familia', 'trabalho', 'conversao', 'gratidao', 'outros');
CREATE TYPE prayer_status AS ENUM ('ativo', 'atendido', 'arquivado');
CREATE TYPE report_target_type AS ENUM ('publicacao', 'comentario', 'usuario', 'mensagem', 'conteudo', 'intencao');
CREATE TYPE report_status AS ENUM ('pendente', 'analisando', 'resolvido');
CREATE TYPE approval_status AS ENUM ('pendente', 'aprovado', 'rejeitado');
CREATE TYPE product_category AS ENUM ('chain', 'marian', 'inox', 'saint', 'pendant', 'medallion', 'scapular');
CREATE TYPE quote_status AS ENUM ('novo', 'em_andamento', 'atendido', 'fechado', 'cancelado');
CREATE TYPE ai_model AS ENUM ('gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo');
CREATE TYPE notification_category AS ENUM ('caminho', 'renovacao', 'myriam', 'intencoes', 'acamf', 'jornadas', 'novidades', 'associacao');
CREATE TYPE webhook_trigger_type AS ENUM ('chat', 'caminho', 'renovacao', 'myriam', 'intencoes', 'acamf', 'jornadas', 'novidades', 'associacao');
CREATE TYPE progress_status AS ENUM ('ativa', 'concluida', 'pausada');
CREATE TYPE reflection_mood AS ENUM ('grato', 'esperançoso', 'inquieto', 'pacífico', 'outros');
CREATE TYPE interaction_type AS ENUM ('like', 'pray');
CREATE TYPE media_type AS ENUM ('image', 'video', 'text');

-- ============================================================================
-- 3. TABELA DE PERFIS (Entidade User → public.profiles)
--    Vinculada a auth.users do Supabase Auth
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT,
  full_name             TEXT,
  role                  user_role NOT NULL DEFAULT 'user',
  display_name          TEXT,
  bio                   TEXT,
  photo_url             TEXT,
  phone                 TEXT,
  status                user_status DEFAULT 'interessado',
  exclusive_access      BOOLEAN DEFAULT false,
  consecration_date     DATE,
  onboarding_completed  BOOLEAN DEFAULT false,
  preparation_start_date DATE,
  target_consecration_date DATE,
  last_renewal_date     DATE,
  renewals              DATE[] DEFAULT '{}',
  notification_prefs    JSONB DEFAULT '{}',
  created_date          TIMESTAMPTZ DEFAULT now(),
  updated_date          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. FUNÇÕES AUXILIARES
-- ============================================================================

-- Verifica se o usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Atualiza updated_date automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Define created_by_id automaticamente como o usuário atual
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.created_by_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria um perfil automaticamente quando um usuário se registra via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CRIAÇÃO DAS TABELAS
-- ============================================================================

-- UserProgress
CREATE TABLE IF NOT EXISTS public.user_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  current_day     INTEGER NOT NULL DEFAULT 1,
  completed_days  INTEGER[] DEFAULT '{}',
  started_date    DATE,
  last_access_date TIMESTAMPTZ,
  completed_date  DATE,
  status          progress_status DEFAULT 'ativa',
  day_opened_at   JSONB DEFAULT '[]'
);

-- PreparationPhase
CREATE TABLE IF NOT EXISTS public.preparation_phases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now(),
  created_by_id       UUID,
  name                TEXT NOT NULL,
  description         TEXT,
  sort_order          INTEGER DEFAULT 0,
  color               TEXT,
  start_message       TEXT,
  midway_message      TEXT,
  completion_message  TEXT
);

-- PreparationDay
CREATE TABLE IF NOT EXISTS public.preparation_days (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now(),
  created_by_id       UUID,
  day_number          INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 33),
  title               TEXT NOT NULL,
  description         TEXT,
  phase               TEXT,
  text                TEXT,
  prayer              TEXT,
  practice            TEXT,
  reflection_prompt   TEXT,
  audio_url           TEXT,
  video_url           TEXT,
  youtube_id          TEXT,
  image_url           TEXT,
  pdf_url             TEXT,
  links               JSONB DEFAULT '[]',
  related_content_ids TEXT[] DEFAULT '{}',
  is_published        BOOLEAN DEFAULT true
);

-- Reflection
CREATE TABLE IF NOT EXISTS public.reflections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  day_number      INTEGER NOT NULL,
  title           TEXT,
  content         TEXT NOT NULL,
  is_private      BOOLEAN DEFAULT true,
  mood            reflection_mood
);

-- MarianCalendarEvent
CREATE TABLE IF NOT EXISTS public.marian_calendar_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now(),
  created_by_id       UUID,
  title               TEXT NOT NULL,
  description         TEXT,
  event_date          DATE NOT NULL,
  image_url           TEXT,
  type                calendar_event_type DEFAULT 'festa',
  is_featured         BOOLEAN DEFAULT false,
  is_system           BOOLEAN DEFAULT true,
  related_content_ids TEXT[] DEFAULT '{}',
  related_journey_id  TEXT
);

-- Course
CREATE TABLE IF NOT EXISTS public.courses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now(),
  created_by_id       UUID,
  title               TEXT NOT NULL,
  description         TEXT,
  cover_url           TEXT,
  poster_url          TEXT,
  trailer_youtube_id  TEXT,
  category_id         TEXT,
  level               content_level DEFAULT 'iniciante',
  status              content_status NOT NULL DEFAULT 'rascunho',
  featured            BOOLEAN DEFAULT false,
  sort_order          INTEGER DEFAULT 0,
  accent_color        TEXT DEFAULT '#663399'
);

-- ACAMFCategory
CREATE TABLE IF NOT EXISTS public.acamf_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  name        TEXT NOT NULL,
  slug        TEXT,
  description TEXT,
  color       TEXT,
  icon        TEXT,
  sort_order  INTEGER DEFAULT 0
);

-- ACAMFContent
CREATE TABLE IF NOT EXISTS public.acamf_contents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date            TIMESTAMPTZ DEFAULT now(),
  updated_date            TIMESTAMPTZ DEFAULT now(),
  created_by_id           UUID,
  title                   TEXT NOT NULL,
  subtitle                TEXT,
  description             TEXT,
  category_id             TEXT,
  course_id               TEXT,
  lesson_order            INTEGER DEFAULT 0,
  author                  TEXT,
  cover_url               TEXT,
  content                 TEXT,
  content_type            content_type NOT NULL DEFAULT 'texto',
  file_url                TEXT,
  youtube_id              TEXT,
  use_alternative_player  BOOLEAN DEFAULT false,
  tags                    TEXT[] DEFAULT '{}',
  level                   content_level DEFAULT 'iniciante',
  duration                TEXT,
  published_date          DATE,
  status                  content_status NOT NULL DEFAULT 'rascunho',
  related_content_ids     TEXT[] DEFAULT '{}',
  recommended             BOOLEAN DEFAULT false,
  related_day_number      INTEGER,
  view_count              INTEGER DEFAULT 0
);

-- LessonProgress
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date      TIMESTAMPTZ DEFAULT now(),
  updated_date      TIMESTAMPTZ DEFAULT now(),
  created_by_id     UUID,
  lesson_id         TEXT NOT NULL,
  course_id         TEXT,
  completed         BOOLEAN DEFAULT false,
  watched_seconds   INTEGER DEFAULT 0,
  last_watched_date TIMESTAMPTZ
);

-- ContentNote
CREATE TABLE IF NOT EXISTS public.content_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  content_id  TEXT NOT NULL,
  page_number INTEGER,
  text        TEXT NOT NULL,
  color       TEXT DEFAULT 'gold'
);

-- ContentComment
CREATE TABLE IF NOT EXISTS public.content_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date  TIMESTAMPTZ DEFAULT now(),
  updated_date  TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  content_id    TEXT NOT NULL,
  author_name   TEXT,
  author_photo  TEXT,
  author_status user_status DEFAULT 'interessado',
  text          TEXT NOT NULL,
  parent_id     TEXT,
  like_count    INTEGER DEFAULT 0
);

-- CollectiveJourney
CREATE TABLE IF NOT EXISTS public.collective_journeys (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date     TIMESTAMPTZ DEFAULT now(),
  updated_date     TIMESTAMPTZ DEFAULT now(),
  created_by_id    UUID,
  title            TEXT NOT NULL,
  description      TEXT,
  image_url        TEXT,
  start_date       DATE,
  end_date         DATE,
  status           journey_status NOT NULL DEFAULT 'ativa',
  journey_type     journey_type DEFAULT 'consagracao',
  welcome_message  TEXT,
  steps            JSONB DEFAULT '[]',
  content_ids      TEXT[] DEFAULT '{}',
  notices          JSONB DEFAULT '[]',
  participant_count INTEGER DEFAULT 0
);

-- JourneyParticipant
CREATE TABLE IF NOT EXISTS public.journey_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  journey_id      TEXT NOT NULL,
  joined_date     DATE,
  progress        INTEGER DEFAULT 0,
  completed_steps INTEGER[] DEFAULT '{}'
);

-- CertificateTemplate
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now(),
  created_by_id       UUID,
  name                TEXT NOT NULL,
  title               TEXT NOT NULL,
  subtitle            TEXT,
  body_text           TEXT NOT NULL,
  agreement_text      TEXT,
  footer_text         TEXT,
  primary_color       TEXT DEFAULT '#673ab7',
  accent_color        TEXT DEFAULT '#c9a14a',
  border_style        border_style DEFAULT 'classic',
  issuer_name         TEXT DEFAULT 'Theotokos',
  issuer_signature_url TEXT,
  certificate_type    certificate_type NOT NULL DEFAULT 'preparacao',
  is_active           BOOLEAN DEFAULT true
);

-- Certificate
CREATE TABLE IF NOT EXISTS public.certificates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date      TIMESTAMPTZ DEFAULT now(),
  updated_date      TIMESTAMPTZ DEFAULT now(),
  created_by_id     UUID,
  user_id           UUID NOT NULL,
  user_name         TEXT NOT NULL,
  user_email        TEXT,
  template_id       TEXT NOT NULL,
  template_snapshot JSONB,
  certificate_type  certificate_type NOT NULL,
  journey_id        TEXT,
  journey_title     TEXT,
  issue_date        DATE NOT NULL,
  agreement_accepted BOOLEAN,
  agreement_text    TEXT,
  signature_type    cert_signature_type,
  signature_data   TEXT,
  personal_data     JSONB,
  pdf_url           TEXT
);

-- PrayerIntention
CREATE TABLE IF NOT EXISTS public.prayer_intentions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date  TIMESTAMPTZ DEFAULT now(),
  updated_date  TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  text          TEXT NOT NULL,
  image_url     TEXT,
  category      prayer_category NOT NULL DEFAULT 'outros',
  status        prayer_status DEFAULT 'ativo',
  prayer_count  INTEGER DEFAULT 0
);

-- PrayerInteraction
CREATE TABLE IF NOT EXISTS public.prayer_interactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date  TIMESTAMPTZ DEFAULT now(),
  updated_date  TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  intention_id  TEXT NOT NULL,
  prayed        BOOLEAN DEFAULT true
);

-- MyriamPost
CREATE TABLE IF NOT EXISTS public.myriam_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date  TIMESTAMPTZ DEFAULT now(),
  updated_date  TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  text          TEXT NOT NULL,
  image_url     TEXT,
  video_url     TEXT,
  document_url  TEXT,
  author_name   TEXT,
  author_photo  TEXT,
  author_status user_status DEFAULT 'interessado',
  like_count    INTEGER DEFAULT 0,
  prayer_count  INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  tags          TEXT[] DEFAULT '{}',
  is_testimonial BOOLEAN DEFAULT false,
  is_pinned     BOOLEAN DEFAULT false
);

-- MyriamComment
CREATE TABLE IF NOT EXISTS public.myriam_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date  TIMESTAMPTZ DEFAULT now(),
  updated_date  TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  post_id       TEXT NOT NULL,
  parent_id     TEXT,
  author_id     UUID,
  text          TEXT NOT NULL,
  author_name   TEXT,
  author_photo  TEXT
);

-- MyriamInteraction
CREATE TABLE IF NOT EXISTS public.myriam_interactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date  TIMESTAMPTZ DEFAULT now(),
  updated_date  TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  post_id       TEXT NOT NULL,
  type          interaction_type NOT NULL DEFAULT 'like'
);

-- MyriamStory
CREATE TABLE IF NOT EXISTS public.myriam_stories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  author_name     TEXT,
  author_photo    TEXT,
  author_status   user_status DEFAULT 'interessado',
  media_url       TEXT,
  media_type      media_type NOT NULL DEFAULT 'image',
  text            TEXT,
  background_color TEXT DEFAULT 'marian',
  viewers         UUID[] DEFAULT '{}'
);

-- ChatConversation
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date      TIMESTAMPTZ DEFAULT now(),
  updated_date      TIMESTAMPTZ DEFAULT now(),
  created_by_id     UUID,
  participants      UUID[] NOT NULL DEFAULT '{}',
  participant_names TEXT[] DEFAULT '{}',
  participant_photos TEXT[] DEFAULT '{}',
  last_message_text TEXT,
  last_message_date TIMESTAMPTZ,
  last_sender_id    UUID,
  typing_user_id    UUID,
  typing_date       TIMESTAMPTZ
);

-- ChatMessage
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now(),
  created_by_id       UUID,
  conversation_id     TEXT NOT NULL,
  sender_id           UUID,
  sender_name         TEXT,
  sender_photo        TEXT,
  text                TEXT,
  file_url            TEXT,
  file_type           chat_file_type DEFAULT 'image',
  audio_duration      NUMERIC,
  participants        UUID[] NOT NULL DEFAULT '{}',
  read_by             UUID[] DEFAULT '{}',
  reply_to_id         TEXT,
  reply_to_text       TEXT,
  reply_to_sender_name TEXT,
  edited              BOOLEAN DEFAULT false,
  edited_date         TIMESTAMPTZ
);

-- Notification
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date  TIMESTAMPTZ DEFAULT now(),
  updated_date  TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  user_id       UUID NOT NULL,
  category      notification_category NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  read          BOOLEAN DEFAULT false,
  link          TEXT,
  related_id    TEXT,
  video_url     TEXT,
  youtube_id   TEXT
);

-- NotificationSettings
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date            TIMESTAMPTZ DEFAULT now(),
  updated_date            TIMESTAMPTZ DEFAULT now(),
  created_by_id           UUID,
  email_enabled           BOOLEAN DEFAULT false,
  whatsapp_enabled        BOOLEAN DEFAULT false,
  email_sender_name       TEXT NOT NULL DEFAULT 'Theotokos',
  whatsapp_from_number    TEXT,
  whatsapp_phone_number_id TEXT,
  whatsapp_access_token   TEXT,
  trigger_categories      notification_category[] DEFAULT ARRAY['myriam', 'associacao']::notification_category[]
);

-- Report
CREATE TABLE IF NOT EXISTS public.reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  target_type     report_target_type NOT NULL,
  target_id       TEXT,
  reason          TEXT NOT NULL,
  status          report_status DEFAULT 'pendente',
  resolution_note TEXT
);

-- ShareLink
CREATE TABLE IF NOT EXISTS public.share_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  token       TEXT NOT NULL UNIQUE,
  active      BOOLEAN NOT NULL DEFAULT true,
  message     TEXT,
  visits      INTEGER DEFAULT 0,
  shares      INTEGER DEFAULT 0
);

-- FeatureFlag
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  feature     TEXT NOT NULL,
  label       TEXT NOT NULL,
  visible     BOOLEAN NOT NULL DEFAULT true
);

-- UserFeatureAccess
CREATE TABLE IF NOT EXISTS public.user_feature_access (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  user_id     UUID NOT NULL,
  user_email  TEXT,
  feature     TEXT NOT NULL,
  granted     BOOLEAN DEFAULT true
);

-- AIAgent
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date      TIMESTAMPTZ DEFAULT now(),
  updated_date      TIMESTAMPTZ DEFAULT now(),
  created_by_id     UUID,
  name              TEXT NOT NULL,
  description       TEXT,
  instructions       TEXT NOT NULL,
  knowledge_content TEXT,
  knowledge_files   JSONB DEFAULT '[]',
  model             ai_model NOT NULL DEFAULT 'gpt-4o-mini',
  openai_api_key    TEXT,
  welcome_message   TEXT,
  temperature       NUMERIC DEFAULT 0.7,
  is_active         BOOLEAN DEFAULT true
);

-- AgentConversation
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date  TIMESTAMPTZ DEFAULT now(),
  updated_date  TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  agent_id      TEXT NOT NULL,
  agent_name    TEXT,
  title         TEXT,
  messages      JSONB DEFAULT '[]'
);

-- AssociationSettings
CREATE TABLE IF NOT EXISTS public.association_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date            TIMESTAMPTZ DEFAULT now(),
  updated_date            TIMESTAMPTZ DEFAULT now(),
  created_by_id           UUID,
  reading_document_url    TEXT,
  reading_document_label  TEXT DEFAULT 'Estatuto da Associação',
  request_title           TEXT NOT NULL DEFAULT 'Solicitação de Ingresso',
  request_subtitle        TEXT DEFAULT 'Associação Maria Rainha dos Corações',
  request_body_text       TEXT NOT NULL,
  declaration_text        TEXT,
  footer_text             TEXT,
  primary_color           TEXT DEFAULT '#673ab7',
  accent_color            TEXT DEFAULT '#c9a14a',
  border_style            border_style DEFAULT 'classic',
  issuer_name             TEXT DEFAULT 'Associação Maria Rainha dos Corações',
  issuer_signature_url    TEXT,
  is_active               BOOLEAN DEFAULT false,
  cert_title              TEXT DEFAULT 'Certificado de Ingresso',
  cert_subtitle           TEXT DEFAULT 'Associação Maria Rainha dos Corações',
  cert_body_text          TEXT,
  cert_logo_url           TEXT,
  cert_signature_url      TEXT,
  cert_issuer_name        TEXT DEFAULT 'Associação Maria Rainha dos Corações',
  cert_border_style       border_style DEFAULT 'classic',
  cert_primary_color      TEXT DEFAULT '#673ab7',
  cert_accent_color       TEXT DEFAULT '#c9a14a',
  cert_footer_text        TEXT DEFAULT 'Theotokos · Associação Maria Rainha dos Corações',
  montfortian_instagram   TEXT DEFAULT '@missionariosmonforinosbrasil',
  montfortian_whatsapp    TEXT DEFAULT '5531985161127',
  montfortian_email       TEXT DEFAULT 'espiritualidademonfortina@hotmail.com'
);

-- AssociationRequest
CREATE TABLE IF NOT EXISTS public.association_requests (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date            TIMESTAMPTZ DEFAULT now(),
  updated_date            TIMESTAMPTZ DEFAULT now(),
  created_by_id           UUID,
  user_id                 UUID NOT NULL,
  user_name               TEXT NOT NULL,
  user_email              TEXT,
  user_data               JSONB,
  settings_snapshot       JSONB,
  document_read           BOOLEAN DEFAULT false,
  document_read_date      TIMESTAMPTZ,
  personal_data           JSONB,
  signature_type          assoc_signature_type,
  signature_data          TEXT,
  pdf_url                 TEXT,
  status                  approval_status DEFAULT 'pendente',
  request_date            DATE NOT NULL,
  approved_date           DATE,
  inscription_number      TEXT,
  certificate_pdf_url     TEXT,
  admin_note              TEXT,
  approval_token          TEXT,
  authority_status        approval_status DEFAULT 'pendente',
  authority_name          TEXT,
  authority_note          TEXT,
  authority_decision_date TIMESTAMPTZ
);

-- StoreSettings
CREATE TABLE IF NOT EXISTS public.store_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  whatsapp        TEXT NOT NULL,
  brand_name      TEXT NOT NULL DEFAULT 'Theotokos',
  hero_title      TEXT,
  hero_subtitle   TEXT,
  primary_color   TEXT DEFAULT '#663399',
  accent_color    TEXT DEFAULT '#9b59b6',
  logo_url        TEXT,
  message_template TEXT NOT NULL,
  step_labels     TEXT[] DEFAULT ARRAY['Dados', 'Cadeiazinha', 'Medalhões', 'Escapulários', 'Revisão']::TEXT[]
);

-- CatalogProduct
CREATE TABLE IF NOT EXISTS public.catalog_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  slug            TEXT NOT NULL,
  category        product_category NOT NULL,
  label           TEXT NOT NULL,
  image_url       TEXT,
  sort_order      INTEGER DEFAULT 0,
  active          BOOLEAN DEFAULT true,
  in_stock        BOOLEAN DEFAULT true,
  stock_quantity  INTEGER
);

-- QuoteRequest
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date  TIMESTAMPTZ DEFAULT now(),
  updated_date  TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID,
  customer_name TEXT NOT NULL,
  whatsapp      TEXT NOT NULL,
  cep           TEXT NOT NULL,
  street        TEXT,
  number        TEXT,
  complement    TEXT,
  neighborhood  TEXT,
  city          TEXT,
  state         TEXT,
  chains        JSONB DEFAULT '[]',
  medallions    JSONB DEFAULT '[]',
  scapulars     JSONB DEFAULT '[]',
  notes         TEXT,
  status        quote_status NOT NULL DEFAULT 'novo'
);

-- WebhookAutomation
CREATE TABLE IF NOT EXISTS public.webhook_automations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date     TIMESTAMPTZ DEFAULT now(),
  updated_date     TIMESTAMPTZ DEFAULT now(),
  created_by_id    UUID,
  name             TEXT NOT NULL,
  url              TEXT NOT NULL,
  enabled          BOOLEAN DEFAULT true,
  message_template TEXT NOT NULL DEFAULT 'Você recebeu uma nova mensagem de {remetente_nome}: {mensagem_texto}',
  trigger_types    webhook_trigger_type[] DEFAULT ARRAY['chat']::webhook_trigger_type[],
  wait_seconds     INTEGER DEFAULT 30,
  custom_headers   JSONB DEFAULT '{}'
);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) — Espelha as regras do Base44
-- ============================================================================

-- PROFILES (User)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE USING (is_admin());

-- USER_PROGRESS (read: own OR admin; create: own; update: own OR admin; delete: own OR admin)
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_progress_read" ON public.user_progress FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "user_progress_insert" ON public.user_progress FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "user_progress_update" ON public.user_progress FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "user_progress_delete" ON public.user_progress FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- PREPARATION_PHASES (read: public; write: admin)
ALTER TABLE public.preparation_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prep_phases_read" ON public.preparation_phases FOR SELECT USING (true);
CREATE POLICY "prep_phases_insert" ON public.preparation_phases FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "prep_phases_update" ON public.preparation_phases FOR UPDATE USING (is_admin());
CREATE POLICY "prep_phases_delete" ON public.preparation_phases FOR DELETE USING (is_admin());

-- PREPARATION_DAYS (read: published OR admin; write: admin)
ALTER TABLE public.preparation_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prep_days_read" ON public.preparation_days FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY "prep_days_insert" ON public.preparation_days FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "prep_days_update" ON public.preparation_days FOR UPDATE USING (is_admin());
CREATE POLICY "prep_days_delete" ON public.preparation_days FOR DELETE USING (is_admin());

-- REFLECTIONS (read/create/update/delete: own only)
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reflections_read" ON public.reflections FOR SELECT USING (created_by_id = auth.uid());
CREATE POLICY "reflections_insert" ON public.reflections FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "reflections_update" ON public.reflections FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY "reflections_delete" ON public.reflections FOR DELETE USING (created_by_id = auth.uid());

-- MARIAN_CALENDAR_EVENTS (read: public; write: admin)
ALTER TABLE public.marian_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cal_events_read" ON public.marian_calendar_events FOR SELECT USING (true);
CREATE POLICY "cal_events_insert" ON public.marian_calendar_events FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "cal_events_update" ON public.marian_calendar_events FOR UPDATE USING (is_admin());
CREATE POLICY "cal_events_delete" ON public.marian_calendar_events FOR DELETE USING (is_admin());

-- COURSES (read: published OR admin; write: admin)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses_read" ON public.courses FOR SELECT USING (status = 'publicado' OR is_admin());
CREATE POLICY "courses_insert" ON public.courses FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "courses_update" ON public.courses FOR UPDATE USING (is_admin());
CREATE POLICY "courses_delete" ON public.courses FOR DELETE USING (is_admin());

-- ACAMF_CATEGORIES (read: public; write: admin)
ALTER TABLE public.acamf_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read" ON public.acamf_categories FOR SELECT USING (true);
CREATE POLICY "categories_insert" ON public.acamf_categories FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "categories_update" ON public.acamf_categories FOR UPDATE USING (is_admin());
CREATE POLICY "categories_delete" ON public.acamf_categories FOR DELETE USING (is_admin());

-- ACAMF_CONTENTS (read: published OR admin; write: admin)
ALTER TABLE public.acamf_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contents_read" ON public.acamf_contents FOR SELECT USING (status = 'publicado' OR is_admin());
CREATE POLICY "contents_insert" ON public.acamf_contents FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "contents_update" ON public.acamf_contents FOR UPDATE USING (is_admin());
CREATE POLICY "contents_delete" ON public.acamf_contents FOR DELETE USING (is_admin());

-- LESSON_PROGRESS (read/create/update: own; delete: own OR admin)
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_progress_read" ON public.lesson_progress FOR SELECT USING (created_by_id = auth.uid());
CREATE POLICY "lesson_progress_insert" ON public.lesson_progress FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "lesson_progress_update" ON public.lesson_progress FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY "lesson_progress_delete" ON public.lesson_progress FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- CONTENT_NOTES (read/create/update/delete: own only)
ALTER TABLE public.content_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_notes_read" ON public.content_notes FOR SELECT USING (created_by_id = auth.uid());
CREATE POLICY "content_notes_insert" ON public.content_notes FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "content_notes_update" ON public.content_notes FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY "content_notes_delete" ON public.content_notes FOR DELETE USING (created_by_id = auth.uid());

-- CONTENT_COMMENTS (read: public; create: own; update/delete: own OR admin)
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_comments_read" ON public.content_comments FOR SELECT USING (true);
CREATE POLICY "content_comments_insert" ON public.content_comments FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "content_comments_update" ON public.content_comments FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "content_comments_delete" ON public.content_comments FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- COLLECTIVE_JOURNEYS (read: public; write: admin)
ALTER TABLE public.collective_journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journeys_read" ON public.collective_journeys FOR SELECT USING (true);
CREATE POLICY "journeys_insert" ON public.collective_journeys FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "journeys_update" ON public.collective_journeys FOR UPDATE USING (is_admin());
CREATE POLICY "journeys_delete" ON public.collective_journeys FOR DELETE USING (is_admin());

-- JOURNEY_PARTICIPANTS (read: public; create/update: own; delete: own OR admin)
ALTER TABLE public.journey_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_read" ON public.journey_participants FOR SELECT USING (true);
CREATE POLICY "participants_insert" ON public.journey_participants FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "participants_update" ON public.journey_participants FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY "participants_delete" ON public.journey_participants FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- CERTIFICATE_TEMPLATES (read: public; write: admin)
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_templates_read" ON public.certificate_templates FOR SELECT USING (true);
CREATE POLICY "cert_templates_insert" ON public.certificate_templates FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "cert_templates_update" ON public.certificate_templates FOR UPDATE USING (is_admin());
CREATE POLICY "cert_templates_delete" ON public.certificate_templates FOR DELETE USING (is_admin());

-- CERTIFICATES (read: own OR admin; create: own; update/delete: admin)
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certificates_read" ON public.certificates FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "certificates_insert" ON public.certificates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "certificates_update" ON public.certificates FOR UPDATE USING (is_admin());
CREATE POLICY "certificates_delete" ON public.certificates FOR DELETE USING (is_admin());

-- PRAYER_INTENTIONS (read: public; create: own; update/delete: own OR admin)
ALTER TABLE public.prayer_intentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prayer_read" ON public.prayer_intentions FOR SELECT USING (true);
CREATE POLICY "prayer_insert" ON public.prayer_intentions FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "prayer_update" ON public.prayer_intentions FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "prayer_delete" ON public.prayer_intentions FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- PRAYER_INTERACTIONS (read: public; create/update/delete: own)
ALTER TABLE public.prayer_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prayer_int_read" ON public.prayer_interactions FOR SELECT USING (true);
CREATE POLICY "prayer_int_insert" ON public.prayer_interactions FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "prayer_int_update" ON public.prayer_interactions FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY "prayer_int_delete" ON public.prayer_interactions FOR DELETE USING (created_by_id = auth.uid());

-- MYRIAM_POSTS (read: public; create: own; update/delete: own OR admin)
ALTER TABLE public.myriam_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_read" ON public.myriam_posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON public.myriam_posts FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "posts_update" ON public.myriam_posts FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "posts_delete" ON public.myriam_posts FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- MYRIAM_COMMENTS (read: public; create: own; update/delete: own OR admin)
ALTER TABLE public.myriam_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_read" ON public.myriam_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.myriam_comments FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "comments_update" ON public.myriam_comments FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "comments_delete" ON public.myriam_comments FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- MYRIAM_INTERACTIONS (read: public; create/update/delete: own)
ALTER TABLE public.myriam_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interactions_read" ON public.myriam_interactions FOR SELECT USING (true);
CREATE POLICY "interactions_insert" ON public.myriam_interactions FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "interactions_update" ON public.myriam_interactions FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY "interactions_delete" ON public.myriam_interactions FOR DELETE USING (created_by_id = auth.uid());

-- MYRIAM_STORIES (read: public; create: own; update/delete: own OR admin)
ALTER TABLE public.myriam_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories_read" ON public.myriam_stories FOR SELECT USING (true);
CREATE POLICY "stories_insert" ON public.myriam_stories FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "stories_update" ON public.myriam_stories FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "stories_delete" ON public.myriam_stories FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- CHAT_CONVERSATIONS (read/create/update: participant; delete: own OR admin)
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "convos_read" ON public.chat_conversations FOR SELECT USING (auth.uid() = ANY(participants));
CREATE POLICY "convos_insert" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = ANY(participants));
CREATE POLICY "convos_update" ON public.chat_conversations FOR UPDATE USING (auth.uid() = ANY(participants));
CREATE POLICY "convos_delete" ON public.chat_conversations FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- CHAT_MESSAGES (read/create/update: participant; delete: own OR admin)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_read" ON public.chat_messages FOR SELECT USING (auth.uid() = ANY(participants));
CREATE POLICY "messages_insert" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = ANY(participants));
CREATE POLICY "messages_update" ON public.chat_messages FOR UPDATE USING (auth.uid() = ANY(participants));
CREATE POLICY "messages_delete" ON public.chat_messages FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- NOTIFICATIONS (read/create/update/delete: own OR admin)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_read" ON public.notifications FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "notif_delete" ON public.notifications FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- NOTIFICATION_SETTINGS (read/write: admin only)
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_settings_read" ON public.notification_settings FOR SELECT USING (is_admin());
CREATE POLICY "notif_settings_insert" ON public.notification_settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "notif_settings_update" ON public.notification_settings FOR UPDATE USING (is_admin());
CREATE POLICY "notif_settings_delete" ON public.notification_settings FOR DELETE USING (is_admin());

-- REPORTS (read/write: admin only; create: public)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_read" ON public.reports FOR SELECT USING (is_admin());
CREATE POLICY "reports_insert" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "reports_update" ON public.reports FOR UPDATE USING (is_admin());
CREATE POLICY "reports_delete" ON public.reports FOR DELETE USING (is_admin());

-- SHARE_LINKS (read: public; write: admin)
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "share_links_read" ON public.share_links FOR SELECT USING (true);
CREATE POLICY "share_links_insert" ON public.share_links FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "share_links_update" ON public.share_links FOR UPDATE USING (is_admin());
CREATE POLICY "share_links_delete" ON public.share_links FOR DELETE USING (is_admin());

-- FEATURE_FLAGS (read: public; write: admin)
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_read" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "flags_insert" ON public.feature_flags FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "flags_update" ON public.feature_flags FOR UPDATE USING (is_admin());
CREATE POLICY "flags_delete" ON public.feature_flags FOR DELETE USING (is_admin());

-- USER_FEATURE_ACCESS (read: own OR admin; write: admin)
ALTER TABLE public.user_feature_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ufa_read" ON public.user_feature_access FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "ufa_insert" ON public.user_feature_access FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "ufa_update" ON public.user_feature_access FOR UPDATE USING (is_admin());
CREATE POLICY "ufa_delete" ON public.user_feature_access FOR DELETE USING (is_admin());

-- AI_AGENTS (read/write: admin only)
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_read" ON public.ai_agents FOR SELECT USING (is_admin());
CREATE POLICY "agents_insert" ON public.ai_agents FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "agents_update" ON public.ai_agents FOR UPDATE USING (is_admin());
CREATE POLICY "agents_delete" ON public.ai_agents FOR DELETE USING (is_admin());

-- AGENT_CONVERSATIONS (read/create/update/delete: own OR admin)
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_read" ON public.agent_conversations FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "conv_insert" ON public.agent_conversations FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "conv_update" ON public.agent_conversations FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "conv_delete" ON public.agent_conversations FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- ASSOCIATION_SETTINGS (read: public; write: admin)
ALTER TABLE public.association_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assoc_settings_read" ON public.association_settings FOR SELECT USING (true);
CREATE POLICY "assoc_settings_insert" ON public.association_settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "assoc_settings_update" ON public.association_settings FOR UPDATE USING (is_admin());
CREATE POLICY "assoc_settings_delete" ON public.association_settings FOR DELETE USING (is_admin());

-- ASSOCIATION_REQUESTS (read: own OR admin; create: own; update/delete: admin)
ALTER TABLE public.association_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assoc_req_read" ON public.association_requests FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "assoc_req_insert" ON public.association_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "assoc_req_update" ON public.association_requests FOR UPDATE USING (is_admin());
CREATE POLICY "assoc_req_delete" ON public.association_requests FOR DELETE USING (is_admin());

-- STORE_SETTINGS (read: public; write: admin)
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_read" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "store_insert" ON public.store_settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "store_update" ON public.store_settings FOR UPDATE USING (is_admin());
CREATE POLICY "store_delete" ON public.store_settings FOR DELETE USING (is_admin());

-- CATALOG_PRODUCTS (read: public; write: admin)
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_read" ON public.catalog_products FOR SELECT USING (true);
CREATE POLICY "catalog_insert" ON public.catalog_products FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "catalog_update" ON public.catalog_products FOR UPDATE USING (is_admin());
CREATE POLICY "catalog_delete" ON public.catalog_products FOR DELETE USING (is_admin());

-- QUOTE_REQUESTS (read: admin; create: public; update/delete: admin)
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_read" ON public.quote_requests FOR SELECT USING (is_admin());
CREATE POLICY "quotes_insert" ON public.quote_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "quotes_update" ON public.quote_requests FOR UPDATE USING (is_admin());
CREATE POLICY "quotes_delete" ON public.quote_requests FOR DELETE USING (is_admin());

-- WEBHOOK_AUTOMATIONS (read/write: admin only)
ALTER TABLE public.webhook_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhooks_read" ON public.webhook_automations FOR SELECT USING (is_admin());
CREATE POLICY "webhooks_insert" ON public.webhook_automations FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "webhooks_update" ON public.webhook_automations FOR UPDATE USING (is_admin());
CREATE POLICY "webhooks_delete" ON public.webhook_automations FOR DELETE USING (is_admin());

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Trigger: criar perfil automaticamente quando um usuário se registra
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: atualizar updated_date em todas as tabelas (exceto profiles)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != 'profiles'
  LOOP
    EXECUTE format('
      CREATE TRIGGER IF NOT EXISTS set_updated_date_%s
        BEFORE UPDATE ON public.%s
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_date();
    ', t, t);
  END LOOP;
END $$;

-- Trigger: definir created_by_id automaticamente (em todas as tabelas com created_by_id)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != 'profiles'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'created_by_id'
    )
  LOOP
    EXECUTE format('
      CREATE TRIGGER IF NOT EXISTS set_created_by_%s
        BEFORE INSERT ON public.%s
        FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
    ', t, t);
  END LOOP;
END $$;

-- Trigger: atualizar updated_date do profiles
CREATE TRIGGER IF NOT EXISTS set_updated_date_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_date();

-- ============================================================================
-- 8. ÍNDICES (Para performance de consultas frequentes)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_progress_created_by ON public.user_progress(created_by_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_created_by ON public.lesson_progress(created_by_id);
CREATE INDEX IF NOT EXISTS idx_content_notes_content ON public.content_notes(content_id);
CREATE INDEX IF NOT EXISTS idx_content_notes_created_by ON public.content_notes(created_by_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_content ON public.content_comments(content_id);
CREATE INDEX IF NOT EXISTS idx_acamf_contents_category ON public.acamf_contents(category_id);
CREATE INDEX IF NOT EXISTS idx_acamf_contents_course ON public.acamf_contents(course_id);
CREATE INDEX IF NOT EXISTS idx_acamf_contents_status ON public.acamf_contents(status);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_prep_days_day_number ON public.preparation_days(day_number);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.marian_calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_prayer_intentions_status ON public.prayer_intentions(status);
CREATE INDEX IF NOT EXISTS idx_prayer_intentions_category ON public.prayer_intentions(category);
CREATE INDEX IF NOT EXISTS idx_prayer_interactions_intention ON public.prayer_interactions(intention_id);
CREATE INDEX IF NOT EXISTS idx_myriam_posts_created ON public.myriam_posts(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_myriam_posts_testimonial ON public.myriam_posts(is_testimonial);
CREATE INDEX IF NOT EXISTS idx_myriam_comments_post ON public.myriam_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_myriam_interactions_post ON public.myriam_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_myriam_stories_created ON public.myriam_stories(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_participants ON public.chat_conversations USING GIN (participants);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_type ON public.certificates(certificate_type);
CREATE INDEX IF NOT EXISTS idx_journey_participants_journey ON public.journey_participants(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_participants_created_by ON public.journey_participants(created_by_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent ON public.agent_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_by ON public.agent_conversations(created_by_id);
CREATE INDEX IF NOT EXISTS idx_assoc_requests_user ON public.association_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_assoc_requests_status ON public.association_requests(status);
CREATE INDEX IF NOT EXISTS idx_assoc_requests_token ON public.association_requests(approval_token);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON public.quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_feature_access_user ON public.user_feature_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feature_access_feature ON public.user_feature_access(feature);
CREATE INDEX IF NOT EXISTS idx_reflections_created_by ON public.reflections(created_by_id);
CREATE INDEX IF NOT EXISTS idx_reflections_day ON public.reflections(day_number);

-- ============================================================================
-- 9. TABELAS DA CADEIAZINHA E GARANTIA VITALÍCIA
-- ============================================================================

CREATE TYPE warranty_claim_status AS ENUM ('aberta', 'em_analise', 'resolvida');

-- Cadeiazinha
CREATE TABLE IF NOT EXISTS public.cadeiazinhas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  user_id         UUID NOT NULL,
  unique_code     TEXT,
  seller_name     TEXT,
  purchase_date   DATE,
  receipt_date    DATE,
  photos          TEXT[] DEFAULT '{}'
);

-- WarrantyClaim
CREATE TABLE IF NOT EXISTS public.warranty_claims (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now(),
  created_by_id       UUID,
  cadeiazinha_id      TEXT NOT NULL,
  user_id             UUID NOT NULL,
  problem_description TEXT NOT NULL,
  observations        TEXT,
  status              warranty_claim_status DEFAULT 'aberta',
  admin_note          TEXT
);

-- WarrantySettings (singleton)
CREATE TABLE IF NOT EXISTS public.warranty_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  term_text       TEXT,
  cert_title      TEXT DEFAULT 'Certificado de Garantia Vitalícia',
  cert_body_text  TEXT,
  logo_url        TEXT,
  signature_url   TEXT,
  issuer_name     TEXT DEFAULT 'Theotokos',
  primary_color   TEXT DEFAULT '#673ab7',
  accent_color    TEXT DEFAULT '#c9a14a',
  border_style    border_style DEFAULT 'classic',
  footer_text     TEXT DEFAULT 'Theotokos · Garantia Vitalícia'
);

-- RLS — Cadeiazinhas (read/update/delete: own OR admin; create: own)
ALTER TABLE public.cadeiazinhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cadeiazinhas_read" ON public.cadeiazinhas FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "cadeiazinhas_insert" ON public.cadeiazinhas FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "cadeiazinhas_update" ON public.cadeiazinhas FOR UPDATE USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "cadeiazinhas_delete" ON public.cadeiazinhas FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- RLS — WarrantyClaims (read: own OR admin; create: own; update/delete: admin)
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warranty_claims_read" ON public.warranty_claims FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "warranty_claims_insert" ON public.warranty_claims FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "warranty_claims_update" ON public.warranty_claims FOR UPDATE USING (is_admin());
CREATE POLICY "warranty_claims_delete" ON public.warranty_claims FOR DELETE USING (is_admin());

-- RLS — WarrantySettings (read: public; write: admin)
ALTER TABLE public.warranty_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warranty_settings_read" ON public.warranty_settings FOR SELECT USING (true);
CREATE POLICY "warranty_settings_insert" ON public.warranty_settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "warranty_settings_update" ON public.warranty_settings FOR UPDATE USING (is_admin());
CREATE POLICY "warranty_settings_delete" ON public.warranty_settings FOR DELETE USING (is_admin());

-- ============================================================================
-- 6.1 TABELAS ADICIONAIS (Fórmula da Consagração + campos de IA)
-- ============================================================================

-- ConsecrationSettings
CREATE TABLE IF NOT EXISTS public.consecration_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date      TIMESTAMPTZ DEFAULT now(),
  updated_date      TIMESTAMPTZ DEFAULT now(),
  created_by_id     UUID,
  formula_pdf_url   TEXT,
  formula_pdf_label TEXT NOT NULL DEFAULT 'Fórmula da Consagração'
);

-- Novos campos em ai_agents
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS icon_url TEXT;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS is_floating_main BOOLEAN DEFAULT false;

-- RLS — ConsecrationSettings (read: public; write: admin)
ALTER TABLE public.consecration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consecration_settings_read" ON public.consecration_settings FOR SELECT USING (true);
CREATE POLICY "consecration_settings_insert" ON public.consecration_settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "consecration_settings_update" ON public.consecration_settings FOR UPDATE USING (is_admin());
CREATE POLICY "consecration_settings_delete" ON public.consecration_settings FOR DELETE USING (is_admin());

-- Seed da feature flag do botão flutuante
INSERT INTO public.feature_flags (feature, label, visible)
SELECT 'assistente_ia_flutuante', 'Assistente IA (botão flutuante)', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.feature_flags WHERE feature = 'assistente_ia_flutuante'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cadeiazinhas_user ON public.cadeiazinhas(user_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_user ON public.warranty_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_cadeiazinha ON public.warranty_claims(cadeiazinha_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON public.warranty_claims(status);

-- ============================================================================
-- 10. OTP CADASTRO VIA WHATSAPP
-- ============================================================================

-- WhatsappOtpSettings (singleton)
CREATE TABLE IF NOT EXISTS public.whatsapp_otp_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date              TIMESTAMPTZ DEFAULT now(),
  updated_date              TIMESTAMPTZ DEFAULT now(),
  created_by_id             UUID,
  enabled                   BOOLEAN NOT NULL DEFAULT false,
  webhook_url               TEXT,
  message_template          TEXT NOT NULL DEFAULT 'Olá! Seu código de verificação Theotokos é: {{token}}',
  token_expiration_minutes  INTEGER NOT NULL DEFAULT 5,
  max_attempts              INTEGER NOT NULL DEFAULT 5,
  max_resends               INTEGER NOT NULL DEFAULT 3
);

-- WhatsappOtp (registros de tokens pendentes)
CREATE TABLE IF NOT EXISTS public.whatsapp_otps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  email           TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  token_hash       TEXT NOT NULL,
  expires_at       TIMESTAMPTZ NOT NULL,
  attempts_used    INTEGER NOT NULL DEFAULT 0,
  resends_used     INTEGER NOT NULL DEFAULT 0,
  verified         BOOLEAN NOT NULL DEFAULT false
);

-- RLS — WhatsappOtpSettings (read: public; write: admin)
ALTER TABLE public.whatsapp_otp_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_otp_settings_read" ON public.whatsapp_otp_settings FOR SELECT USING (true);
CREATE POLICY "whatsapp_otp_settings_insert" ON public.whatsapp_otp_settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "whatsapp_otp_settings_update" ON public.whatsapp_otp_settings FOR UPDATE USING (is_admin());
CREATE POLICY "whatsapp_otp_settings_delete" ON public.whatsapp_otp_settings FOR DELETE USING (is_admin());

-- RLS — WhatsappOtp (apenas admin; edge functions usam service role e ignoram RLS)
ALTER TABLE public.whatsapp_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_otps_read" ON public.whatsapp_otps FOR SELECT USING (is_admin());
CREATE POLICY "whatsapp_otps_insert" ON public.whatsapp_otps FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "whatsapp_otps_update" ON public.whatsapp_otps FOR UPDATE USING (is_admin());
CREATE POLICY "whatsapp_otps_delete" ON public.whatsapp_otps FOR DELETE USING (is_admin());

-- Seed de configuração padrão (desativado)
INSERT INTO public.whatsapp_otp_settings (enabled, message_template, token_expiration_minutes, max_attempts, max_resends)
SELECT false, 'Olá! Seu código de verificação Theotokos é: {{token}}', 5, 5, 3
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_otp_settings);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_otps_email ON public.whatsapp_otps(email);
CREATE INDEX IF NOT EXISTS idx_whatsapp_otps_expires ON public.whatsapp_otps(expires_at);

-- ============================================================================
-- 11. MODO DE CADASTRO (auto vs aprovação do admin)
-- ============================================================================

-- Adiciona coluna is_approved em profiles (default true para usuários existentes)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT true;

-- RegistrationSettings (singleton)
CREATE TABLE IF NOT EXISTS public.registration_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  mode            TEXT NOT NULL DEFAULT 'auto' CHECK (mode IN ('auto', 'approval')),
  pending_message TEXT NOT NULL DEFAULT 'Seu cadastro foi recebido e está aguardando aprovação do administrador. Você receberá acesso em breve.'
);

-- RLS — RegistrationSettings (read: public; write: admin)
ALTER TABLE public.registration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reg_settings_read" ON public.registration_settings FOR SELECT USING (true);
CREATE POLICY "reg_settings_insert" ON public.registration_settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "reg_settings_update" ON public.registration_settings FOR UPDATE USING (is_admin());
CREATE POLICY "reg_settings_delete" ON public.registration_settings FOR DELETE USING (is_admin());

-- Seed padrão (modo auto)
INSERT INTO public.registration_settings (mode, pending_message)
SELECT 'auto', 'Seu cadastro foi recebido e está aguardando aprovação do administrador. Você receberá acesso em breve.'
WHERE NOT EXISTS (SELECT 1 FROM public.registration_settings);

-- ============================================================================
-- 9. TABELAS DE ORAÇÕES (PrayerCategory, Prayer, PrayerFavorite)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prayer_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  name            TEXT NOT NULL,
  sort_order      INTEGER DEFAULT 0,
  icon            TEXT,
  color           TEXT
);

CREATE TABLE IF NOT EXISTS public.prayers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  title           TEXT NOT NULL,
  category_id     TEXT NOT NULL,
  content         TEXT,
  audio_url       TEXT,
  cover_url       TEXT,
  sort_order      INTEGER DEFAULT 0,
  is_published    BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.prayer_favorites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  prayer_id       TEXT NOT NULL
);

-- RLS: PrayerCategory (read: public; write: admin)
ALTER TABLE public.prayer_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prayer_cat_read" ON public.prayer_categories FOR SELECT USING (true);
CREATE POLICY "prayer_cat_insert" ON public.prayer_categories FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "prayer_cat_update" ON public.prayer_categories FOR UPDATE USING (is_admin());
CREATE POLICY "prayer_cat_delete" ON public.prayer_categories FOR DELETE USING (is_admin());

-- RLS: Prayer (read: published OR admin; write: admin)
ALTER TABLE public.prayers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prayers_read" ON public.prayers FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY "prayers_insert" ON public.prayers FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "prayers_update" ON public.prayers FOR UPDATE USING (is_admin());
CREATE POLICY "prayers_delete" ON public.prayers FOR DELETE USING (is_admin());

-- RLS: PrayerFavorite (read/write/delete: own only)
ALTER TABLE public.prayer_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prayer_fav_read" ON public.prayer_favorites FOR SELECT USING (created_by_id = auth.uid());
CREATE POLICY "prayer_fav_insert" ON public.prayer_favorites FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY "prayer_fav_update" ON public.prayer_favorites FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY "prayer_fav_delete" ON public.prayer_favorites FOR DELETE USING (created_by_id = auth.uid());

-- Triggers (updated_date + created_by_id)
DO $$ BEGIN
  CREATE TRIGGER set_updated_date_prayer_categories
    BEFORE UPDATE ON public.prayer_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_date();
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TRIGGER set_updated_date_prayers
    BEFORE UPDATE ON public.prayers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_date();
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TRIGGER set_updated_date_prayer_favorites
    BEFORE UPDATE ON public.prayer_favorites
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_date();
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TRIGGER set_created_by_prayer_categories
    BEFORE INSERT ON public.prayer_categories
    FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TRIGGER set_created_by_prayers
    BEFORE INSERT ON public.prayers
    FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TRIGGER set_created_by_prayer_favorites
    BEFORE INSERT ON public.prayer_favorites
    FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_prayers_category ON public.prayers(category_id);
CREATE INDEX IF NOT EXISTS idx_prayer_favorites_created_by ON public.prayer_favorites(created_by_id);
CREATE INDEX IF NOT EXISTS idx_prayer_favorites_prayer ON public.prayer_favorites(prayer_id);

-- ============================================================================
-- FIM DO SCRIPT
-- 
-- Após executar este script no Supabase:
-- 1. As 38 tabelas estarão criadas com RLS ativo
-- 2. A função is_admin() verifica o role do usuário em public.profiles
-- 3. O trigger handle_new_user cria um perfil automaticamente no signup
-- 4. Os triggers set_created_by e update_updated_date rodam em todas as tabelas
-- 5. Os índices otimizam as consultas mais frequentes
-- 
-- ============================================================================
-- 12. APRIMORAMENTO DAS JORNADAS COLETIVAS
-- ============================================================================

-- Novas colunas em collective_journeys (texto de apresentação do banner)
ALTER TABLE public.collective_journeys ADD COLUMN IF NOT EXISTS presentation_text TEXT;

-- Novas colunas em journey_participants (intenção do participante + data de conclusão)
ALTER TABLE public.journey_participants ADD COLUMN IF NOT EXISTS intent TEXT;
ALTER TABLE public.journey_participants ADD COLUMN IF NOT EXISTS completed_date DATE;

-- Tabela de biblioteca de conteúdos de jornada (reutilizável entre jornadas)
CREATE TABLE IF NOT EXISTS public.journey_contents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  title           TEXT NOT NULL,
  content         TEXT,
  content_type    TEXT DEFAULT 'texto',
  file_url        TEXT,
  audio_url       TEXT,
  cover_url       TEXT,
  youtube_id      TEXT,
  is_published    BOOLEAN DEFAULT true
);

-- RLS: JourneyContent (read: published OR admin; write: admin)
ALTER TABLE public.journey_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journey_content_read" ON public.journey_contents FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY "journey_content_insert" ON public.journey_contents FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "journey_content_update" ON public.journey_contents FOR UPDATE USING (is_admin());
CREATE POLICY "journey_content_delete" ON public.journey_contents FOR DELETE USING (is_admin());

-- Triggers
DO $$ BEGIN
  CREATE TRIGGER set_updated_date_journey_contents
    BEFORE UPDATE ON public.journey_contents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_date();
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TRIGGER set_created_by_journey_contents
    BEFORE INSERT ON public.journey_contents
    FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_journey_contents_created ON public.journey_contents(created_date DESC);

-- ============================================================================
-- 13. WEBHOOK DE ORÇAMENTO (status do pedido + código de rastreio)
-- ============================================================================

-- Novos valores no enum de status do pedido
ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'enviado';
ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'saiu_para_entrega';

-- Gatilho 'orcamento' no enum de triggers de webhook
ALTER TYPE public.webhook_trigger_type ADD VALUE IF NOT EXISTS 'orcamento';

-- Código de rastreio do pedido (inserido pelo admin ao marcar como 'enviado')
ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS tracking_code TEXT;

-- Status de pedido que disparam o webhook (filtro configurável por webhook)
ALTER TABLE public.webhook_automations ADD COLUMN IF NOT EXISTS orcamento_statuses TEXT[] DEFAULT '{}';

-- Telefone persistido para disparos de teste do webhook
ALTER TABLE public.webhook_automations ADD COLUMN IF NOT EXISTS test_phone TEXT;

-- Índice para localizar rapidamente pedidos pelo código na página pública de rastreio
CREATE INDEX IF NOT EXISTS idx_quote_requests_tracking_code ON public.quote_requests(tracking_code);

-- ============================================================================
-- PRÓXIMOS PASSOS PARA MIGRAÇÃO COMPLETA DO APP:
-- a) Instalar @supabase/supabase-js no projeto
-- b) Substituir base44.entities.X por supabase.from('X') em todas as páginas
-- c) Substituir base44.auth por supabase.auth em Login/Register/etc
-- d) Reescrever as backend functions (base44/functions/) para usar Supabase
-- e) Reescrever as workflows para usar Supabase + cron/edge functions
-- f) Migrar os dados existentes (export do Base44 → import no Supabase)
-- g) Configurar Storage do Supabase para uploads de arquivos
-- ============================================================================

-- Controle administrativo do rastreamento de pedidos
INSERT INTO public.feature_flags (feature, label, visible)
SELECT 'rastreamento_correios', 'Rastreamento de pedidos (Correios)', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.feature_flags WHERE feature = 'rastreamento_correios'
);