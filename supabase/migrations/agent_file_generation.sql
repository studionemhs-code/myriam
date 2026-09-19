-- ============================================================================
-- Geração de PDF e Imagem pelo Agente — cotas mensais
-- ============================================================================

-- Campos de cota em cada agente (admin define o limite mensal por usuário comum)
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS max_pdfs_per_month integer DEFAULT 10;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS max_images_per_month integer DEFAULT 10;

-- Tabela de consumo mensal por usuário por agente
CREATE TABLE IF NOT EXISTS agent_file_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id text NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  month_year text NOT NULL, -- formato 'YYYY-MM'
  pdf_count integer DEFAULT 0,
  image_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, agent_id, month_year)
);

ALTER TABLE agent_file_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own quotas" ON agent_file_quotas
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins manage quotas" ON agent_file_quotas
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Índice para consultas de cota
CREATE INDEX IF NOT EXISTS idx_agent_file_quotas_lookup
  ON agent_file_quotas (agent_id, user_id, month_year);