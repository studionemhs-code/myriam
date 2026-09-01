-- ============================================================================
-- UPGRADE DO AGENTE IA — Ferramentas, Memória, Raciocínio
-- ============================================================================

-- Novos campos em ai_agents
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS tools_enabled TEXT[] DEFAULT '{}';
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS reasoning_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS message_delay_ms INTEGER DEFAULT 0;

-- Tabela de memória de longo prazo (um registro por agente+usuário)
CREATE TABLE IF NOT EXISTS public.agent_memories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  agent_id        TEXT NOT NULL,
  user_id         UUID NOT NULL,
  facts           JSONB DEFAULT '[]'
);

-- Um registro único por par agente+usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_memories_unique ON public.agent_memories(agent_id, user_id);

-- RLS: apenas admin lê/escreve (a edge function usa service role e ignora RLS)
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_memories_read" ON public.agent_memories;
CREATE POLICY "agent_memories_read" ON public.agent_memories FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "agent_memories_insert" ON public.agent_memories;
CREATE POLICY "agent_memories_insert" ON public.agent_memories FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "agent_memories_update" ON public.agent_memories;
CREATE POLICY "agent_memories_update" ON public.agent_memories FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "agent_memories_delete" ON public.agent_memories;
CREATE POLICY "agent_memories_delete" ON public.agent_memories FOR DELETE USING (is_admin());

-- Triggers
DO $$ BEGIN
  CREATE TRIGGER set_updated_date_agent_memories
    BEFORE UPDATE ON public.agent_memories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_date();
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TRIGGER set_created_by_agent_memories
    BEFORE INSERT ON public.agent_memories
    FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
EXCEPTION WHEN duplicate_object THEN null;
END $$;