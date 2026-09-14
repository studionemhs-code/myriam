ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS chat_retention_days INTEGER NOT NULL DEFAULT 7;

UPDATE public.ai_agents
SET chat_retention_days = 7
WHERE chat_retention_days < 7;

ALTER TABLE public.ai_agents
  DROP CONSTRAINT IF EXISTS ai_agents_chat_retention_days_min;
ALTER TABLE public.ai_agents
  ADD CONSTRAINT ai_agents_chat_retention_days_min CHECK (chat_retention_days >= 7);

CREATE OR REPLACE FUNCTION public.load_agent_conversation(p_agent_id TEXT)
RETURNS SETOF public.agent_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_retention_days INTEGER := 7;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT GREATEST(COALESCE(chat_retention_days, 7), 7)
  INTO v_retention_days
  FROM public.ai_agents
  WHERE id = p_agent_id;

  DELETE FROM public.agent_conversations
  WHERE agent_id = p_agent_id
    AND created_by_id = v_user_id
    AND updated_date < now() - make_interval(days => COALESCE(v_retention_days, 7));

  RETURN QUERY
  SELECT conversation.*
  FROM public.agent_conversations conversation
  WHERE conversation.agent_id = p_agent_id
    AND conversation.created_by_id = v_user_id
  ORDER BY conversation.updated_date DESC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.load_agent_conversation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.load_agent_conversation(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_agent_conversation_retention()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retention_days INTEGER := 7;
BEGIN
  SELECT GREATEST(COALESCE(chat_retention_days, 7), 7)
  INTO v_retention_days
  FROM public.ai_agents
  WHERE id = NEW.agent_id;

  DELETE FROM public.agent_conversations
  WHERE agent_id = NEW.agent_id
    AND created_by_id = NEW.created_by_id
    AND id <> NEW.id
    AND updated_date < now() - make_interval(days => COALESCE(v_retention_days, 7));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_agent_conversation_retention_trigger ON public.agent_conversations;
CREATE TRIGGER enforce_agent_conversation_retention_trigger
AFTER INSERT OR UPDATE ON public.agent_conversations
FOR EACH ROW EXECUTE FUNCTION public.enforce_agent_conversation_retention();