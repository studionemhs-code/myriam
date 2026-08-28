-- ============================================================================
-- THEOTOKOS — Migração de Workflows do Base44 para Supabase
-- 
-- Recria os 7 workflows automatizados que ficaram órfãos após a remoção do
-- runtime do Base44, usando pg_cron (agendamentos) e triggers do Postgres
-- com pg_net assíncrono (eventos de entidade).
-- 
-- INSTRUÇÕES:
-- Cole este script inteiro no SQL Editor do Supabase e execute.
-- A service_role key já está preenchida abaixo.
-- 
-- Workflows migrados:
--   1. Story Cleanup (agendado, a cada hora)
--   2. Daily Reminders (agendado, 08:00 BRT / 11:00 UTC)
--   3. Nova Aula Publicada (trigger de entidade)
--   4. Novo Curso Publicado (trigger de entidade)
--   5. Nova Funcionalidade Liberada (trigger de entidade)
--   6. Webhook Chat Offline (fila + cron a cada minuto)
--   7. Webhook Notificacao Offline (fila + cron a cada minuto)
-- ============================================================================

-- ============================================================================
-- 1. EXTENSÕES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- ============================================================================
-- 2. ARMAZENAR SERVICE ROLE KEY NO VAULT
--    (chave já preenchida — não é necessário editar)
-- ============================================================================
DO $$
BEGIN
  DELETE FROM vault.secrets WHERE name = 'supabase_service_role_key';
END $$;

SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0cnJua3hycHlqeWFld2ZwaXdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzYyMzA1NCwiZXhwIjoyMTAzMTk5MDU0fQ.k-8qD-6pR4zjx0N1MZEVMaS_oGupFXLDrT3AuORV3KQ',
  'supabase_service_role_key',
  'Chave de service role para chamadas de cron e triggers às Edge Functions'
);

-- ============================================================================
-- 3. TABELA DE WEBHOOKS PENDENTES (fila para disparo com espera de 30s)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pending_webhooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type  TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  dispatch_at   TIMESTAMPTZ NOT NULL,
  processed     BOOLEAN NOT NULL DEFAULT false,
  created_date  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_webhooks_dispatch
  ON public.pending_webhooks(dispatch_at)
  WHERE processed = false;

ALTER TABLE public.pending_webhooks ENABLE ROW LEVEL SECURITY;
-- Sem políticas: apenas service role (cron/triggers SECURITY DEFINER) acessa.

-- ============================================================================
-- 4. FUNÇÃO AUXILIAR — chamar Edge Function via pg_net assíncrono
--    SECURITY DEFINER para que triggers de usuários comuns possam acessar
--    a chave do vault (acessível apenas ao role postgres).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.call_edge_function(
  fn_name TEXT,
  body JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
DECLARE
  service_key TEXT;
  project_url TEXT := 'https://strrnkxrpyjyaewfpiwh.functions.supabase.co';
BEGIN
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key';

  IF service_key IS NULL THEN
    RAISE EXCEPTION 'service_role key não encontrada no vault. Execute o passo 2 do script.';
  END IF;

  PERFORM net.http_post(
    url := project_url || '/' || fn_name,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'Content-Type', 'application/json'
    ),
    body := body
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. PG_CRON — AGENDAMENTOS
-- ============================================================================

-- 5.1 Limpeza de stories a cada hora (0 * * * *)
SELECT cron.schedule(
  'cleanup-stories-hourly',
  '0 * * * *',
  $$SELECT public.call_edge_function('cleanup-stories', '{}'::jsonb)$$
);

-- 5.2 Lembretes diários às 08:00 BRT (11:00 UTC = 08:00 America/Sao_Paulo)
SELECT cron.schedule(
  'daily-reminders-morning',
  '0 11 * * *',
  $$SELECT public.call_edge_function('daily-reminders', '{}'::jsonb)$$
);

-- 5.3 Processar webhooks pendentes a cada minuto
CREATE OR REPLACE FUNCTION public.process_pending_webhooks()
RETURNS void AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, trigger_type, entity_id
    FROM public.pending_webhooks
    WHERE processed = false AND dispatch_at <= now()
    ORDER BY dispatch_at
    LIMIT 50
  LOOP
    PERFORM public.call_edge_function('dispatch-webhooks', jsonb_build_object(
      'trigger_type', rec.trigger_type,
      'entity_id', rec.entity_id
    ));
    UPDATE public.pending_webhooks SET processed = true WHERE id = rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'process-pending-webhooks',
  '* * * * *',
  $$SELECT public.process_pending_webhooks()$$
);

-- ============================================================================
-- 6. TRIGGERS DE BROADCAST (eventos de entidade → pg_net assíncrono)
-- ============================================================================

-- 6.1 Nova aula publicada (ACAMFContent)
CREATE OR REPLACE FUNCTION public.broadcast_new_lesson()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'publicado')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'publicado' AND NEW.status = 'publicado')
  THEN
    PERFORM public.call_edge_function('broadcast-notification', jsonb_build_object(
      'category', 'acamf',
      'title', 'Nova aula disponível: ' || NEW.title,
      'body', 'Uma nova aula foi publicada na ACAMF. Toque para assistir agora.',
      'link', '/acamf/' || NEW.id,
      'youtube_id', COALESCE(NEW.youtube_id, ''),
      'related_id', NEW.id
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_broadcast_new_lesson ON public.acamf_contents;
CREATE TRIGGER trg_broadcast_new_lesson
  AFTER INSERT OR UPDATE ON public.acamf_contents
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_new_lesson();

-- 6.2 Novo curso publicado
CREATE OR REPLACE FUNCTION public.broadcast_new_course()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'publicado')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'publicado' AND NEW.status = 'publicado')
  THEN
    PERFORM public.call_edge_function('broadcast-notification', jsonb_build_object(
      'category', 'acamf',
      'title', 'Novo curso disponível: ' || NEW.title,
      'body', 'Um novo curso foi adicionado à ACAMF. Toque para assistir o trailer e começar.',
      'link', '/acamf/curso/' || NEW.id,
      'youtube_id', COALESCE(NEW.trailer_youtube_id, ''),
      'related_id', NEW.id
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_broadcast_new_course ON public.courses;
CREATE TRIGGER trg_broadcast_new_course
  AFTER INSERT OR UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_new_course();

-- 6.3 Nova funcionalidade liberada (FeatureFlag)
CREATE OR REPLACE FUNCTION public.broadcast_new_feature()
RETURNS TRIGGER AS $$
BEGIN
  -- Dispara apenas na transição false → true
  IF (TG_OP = 'UPDATE' AND COALESCE(OLD.visible, false) = false AND NEW.visible = true)
  THEN
    PERFORM public.call_edge_function('broadcast-notification', jsonb_build_object(
      'category', 'novidades',
      'title', 'Nova funcionalidade: ' || NEW.label,
      'body', 'A funcionalidade ' || NEW.label || ' agora está disponível no app. Toque para saber mais.',
      'related_id', NEW.id
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_broadcast_new_feature ON public.feature_flags;
CREATE TRIGGER trg_broadcast_new_feature
  AFTER UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_new_feature();

-- ============================================================================
-- 7. TRIGGERS DE WEBHOOK OFFLINE (fila com espera de 30s)
--    SECURITY DEFINER para bypassar RLS da tabela pending_webhooks.
-- ============================================================================

-- 7.1 Nova mensagem de chat → enfileirar webhook
CREATE OR REPLACE FUNCTION public.queue_chat_webhook()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pending_webhooks (trigger_type, entity_id, dispatch_at)
  VALUES ('chat', NEW.id, now() + interval '30 seconds');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_queue_chat_webhook ON public.chat_messages;
CREATE TRIGGER trg_queue_chat_webhook
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.queue_chat_webhook();

-- 7.2 Nova notificação → enfileirar webhook com a categoria da notificação
CREATE OR REPLACE FUNCTION public.queue_notification_webhook()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pending_webhooks (trigger_type, entity_id, dispatch_at)
  VALUES (NEW.category, NEW.id, now() + interval '30 seconds');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_queue_notification_webhook ON public.notifications;
CREATE TRIGGER trg_queue_notification_webhook
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.queue_notification_webhook();

-- ============================================================================
-- FIM DO SCRIPT
-- 
-- Após executar, verifique:
--   SELECT jobname, schedule, active FROM cron.job;
--   SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE NOT tgisinternal;
-- ============================================================================