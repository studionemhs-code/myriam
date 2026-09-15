BEGIN;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS admin_only boolean NOT NULL DEFAULT false;

-- One canonical thread per member/agent; old rows remain intact and their messages are included.
CREATE OR REPLACE FUNCTION public.agent_thread_snapshot(p_agent_id text, p_user_id text)
RETURNS SETOF public.agent_conversations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.agent_conversations;
BEGIN
  SELECT * INTO v FROM public.agent_conversations WHERE agent_id=p_agent_id AND created_by_id=p_user_id ORDER BY created_date DESC,id DESC LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT COALESCE(jsonb_agg(m ORDER BY stamp,source_date,position), '[]'::jsonb) INTO v.messages FROM (
    SELECT DISTINCT ON (item.value) item.value m, COALESCE(item.value->>'timestamp',c.created_date::text) stamp, c.created_date source_date, item.ordinality position
    FROM public.agent_conversations c CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c.messages,'[]'::jsonb)) WITH ORDINALITY item
    WHERE c.agent_id=p_agent_id AND c.created_by_id=p_user_id
    ORDER BY item.value,c.created_date,item.ordinality
  ) messages;
  RETURN NEXT v;
END $$;
REVOKE ALL ON FUNCTION public.agent_thread_snapshot(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_thread_snapshot(text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.load_agent_conversation(p_agent_id text)
RETURNS SETOF public.agent_conversations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user text := auth.uid()::text; retention integer;
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  SELECT GREATEST(COALESCE(chat_retention_days,7),7) INTO retention FROM ai_agents WHERE id=p_agent_id AND is_active AND (NOT admin_only OR public.is_admin());
  IF NOT FOUND THEN RAISE EXCEPTION 'Agente não disponível'; END IF;
  DELETE FROM agent_conversations WHERE agent_id=p_agent_id AND created_by_id=v_user AND updated_date < now()-make_interval(days=>retention);
  RETURN QUERY SELECT * FROM public.agent_thread_snapshot(p_agent_id,v_user);
END $$;
REVOKE ALL ON FUNCTION public.load_agent_conversation(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.load_agent_conversation(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_agent_thread(p_agent_id text,p_user_id text)
RETURNS SETOF public.agent_conversations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_agent public.ai_agents;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_agent_id||':'||p_user_id,0));
  SELECT * INTO STRICT v_agent FROM ai_agents WHERE id=p_agent_id AND is_active;
  DELETE FROM agent_conversations WHERE agent_id=p_agent_id AND created_by_id=p_user_id AND updated_date < now()-make_interval(days=>GREATEST(COALESCE(v_agent.chat_retention_days,7),7));
  IF NOT EXISTS (SELECT 1 FROM agent_conversations WHERE agent_id=p_agent_id AND created_by_id=p_user_id) THEN
    INSERT INTO agent_conversations(agent_id,agent_name,created_by_id,messages) VALUES(p_agent_id,v_agent.name,p_user_id,'[]'::jsonb);
  END IF;
  RETURN QUERY SELECT * FROM public.agent_thread_snapshot(p_agent_id,p_user_id);
END $$;
REVOKE ALL ON FUNCTION public.ensure_agent_thread(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_agent_thread(text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.append_agent_messages(p_conversation_id text,p_user_id text,p_messages jsonb,p_pending_action jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF jsonb_typeof(p_messages) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Mensagens inválidas'; END IF;
  UPDATE agent_conversations SET messages=COALESCE(messages,'[]'::jsonb)||p_messages,pending_action=p_pending_action,updated_date=now()
  WHERE id=p_conversation_id AND created_by_id=p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversa não encontrada'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.append_agent_messages(text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.append_agent_messages(text,text,jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.set_agent_message_audio(p_conversation_id text,p_message_id text,p_audio_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR length(p_audio_url)>2048 OR p_audio_url NOT LIKE 'https://strrnkxrpyjyaewfpiwh.supabase.co/storage/v1/object/public/uploads/speech/%' THEN RAISE EXCEPTION 'Áudio inválido'; END IF;
  UPDATE agent_conversations c SET messages=(SELECT jsonb_agg(CASE WHEN m->>'id'=p_message_id AND m->>'role'='assistant' THEN m||jsonb_build_object('audio_url',p_audio_url) ELSE m END ORDER BY position) FROM jsonb_array_elements(c.messages) WITH ORDINALITY AS entries(m,position))
  WHERE c.id=p_conversation_id AND c.created_by_id=auth.uid()::text AND EXISTS(SELECT 1 FROM ai_agents a WHERE a.id=c.agent_id AND a.is_active AND (NOT a.admin_only OR public.is_admin()));
END $$;
REVOKE ALL ON FUNCTION public.set_agent_message_audio(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_agent_message_audio(text,text,text) TO authenticated;

-- A restrictive policy complements existing ownership policies without exposing agent secrets.
CREATE OR REPLACE FUNCTION public.can_use_agent(p_agent_id text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM ai_agents WHERE id=p_agent_id AND is_active AND (NOT admin_only OR public.is_admin()));
$$;
REVOKE ALL ON FUNCTION public.can_use_agent(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_use_agent(text) TO authenticated;
DROP POLICY IF EXISTS agent_visibility ON public.agent_conversations;
CREATE POLICY agent_visibility ON public.agent_conversations AS RESTRICTIVE FOR ALL TO authenticated USING(public.can_use_agent(agent_id)) WITH CHECK(public.can_use_agent(agent_id));
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='agent_conversations') THEN
   ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_conversations;
 END IF;
END $$;
COMMIT;