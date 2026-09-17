-- ============================================================================
-- Agente Proativo (Follow-up): opt-in mestre do usuário
-- ============================================================================

-- Adiciona o interruptor mestre na tabela profiles.
-- Default true (permite follow-ups do agente). Quando false, nenhum follow-up
-- proativo é gerado em qualquer canal (chat, sino, push).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agent_proactive_enabled boolean DEFAULT true;

COMMENT ON COLUMN public.profiles.agent_proactive_enabled IS
  'Permitir que o assistente de IA inicie conversas proativamente (follow-up do itinerário espiritual).';