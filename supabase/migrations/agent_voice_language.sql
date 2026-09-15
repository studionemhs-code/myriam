-- Adiciona o idioma da voz (PT-BR padrão) aos agentes IA.
-- Permite fixar a pronúncia/sotaque na síntese de voz (GenerateSpeech).

ALTER TABLE ai_agents
  ADD COLUMN IF NOT EXISTS voice_language TEXT NOT NULL DEFAULT 'pt-BR';

-- Restringe aos valores válidos.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_agents_voice_language_check'
  ) THEN
    ALTER TABLE ai_agents
      ADD CONSTRAINT ai_agents_voice_language_check
      CHECK (voice_language IN ('pt-BR', 'pt-PT', 'en', 'es', 'auto'));
  END IF;
END$$;