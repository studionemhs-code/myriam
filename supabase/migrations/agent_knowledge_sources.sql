-- ============================================================================
-- Base de Conhecimento Robusta do Agente: fontes externas (site, YouTube, Instagram, áudio)
-- ============================================================================

ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS knowledge_sources jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.ai_agents.knowledge_sources IS
  'Fontes de conhecimento externas processadas: cada item tem type (site|youtube|instagram|audio), url, label, extracted_content, status (pending|processing|ready|error), error_message, processed_at.';