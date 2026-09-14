ALTER TABLE public.agent_conversations
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.get_agent_unread_count(p_agent_id TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM((
    SELECT COUNT(*)
    FROM jsonb_array_elements(COALESCE(conversation.messages, '[]'::jsonb)) message
    WHERE message->>'role' = 'assistant'
      AND COALESCE(NULLIF(message->>'timestamp', '')::timestamptz, conversation.updated_date)
          > COALESCE(conversation.last_read_at, 'epoch'::timestamptz)
  )), 0)::INTEGER
  FROM public.agent_conversations conversation
  WHERE conversation.agent_id = p_agent_id
    AND conversation.created_by_id = auth.uid()::TEXT;
$$;

CREATE OR REPLACE FUNCTION public.mark_agent_conversation_read(p_agent_id TEXT)
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.agent_conversations
  SET last_read_at = now()
  WHERE agent_id = p_agent_id
    AND created_by_id = auth.uid()::TEXT;
$$;

REVOKE ALL ON FUNCTION public.get_agent_unread_count(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_agent_conversation_read(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_agent_unread_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_agent_conversation_read(TEXT) TO authenticated;

ALTER TABLE public.agent_conversations
  ADD COLUMN IF NOT EXISTS pending_action JSONB;

CREATE TABLE IF NOT EXISTS public.architect_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  agent_id TEXT NOT NULL,
  conversation_id TEXT REFERENCES public.agent_conversations(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id TEXT,
  action_summary TEXT NOT NULL,
  result_status TEXT NOT NULL CHECK (result_status IN ('success', 'error')),
  result_detail TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS architect_audit_log_created_at_idx ON public.architect_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS architect_audit_log_admin_id_idx ON public.architect_audit_log (admin_id);
ALTER TABLE public.architect_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS architect_audit_admin_read ON public.architect_audit_log;
CREATE POLICY architect_audit_admin_read ON public.architect_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles profile
    WHERE profile.id = auth.uid() AND profile.role = 'admin'
  ));

REVOKE INSERT, UPDATE, DELETE ON public.architect_audit_log FROM anon, authenticated;
GRANT SELECT ON public.architect_audit_log TO authenticated;