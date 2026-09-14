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