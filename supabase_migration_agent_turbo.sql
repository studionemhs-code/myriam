-- Capacidades multimodais do Agente IA Turbo
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS files_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS default_voice TEXT DEFAULT 'river';

UPDATE public.ai_agents
SET voice_enabled = COALESCE(voice_enabled, true),
    files_enabled = COALESCE(files_enabled, true),
    default_voice = COALESCE(default_voice, 'river');