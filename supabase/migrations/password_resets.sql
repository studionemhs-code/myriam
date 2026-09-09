-- Tabela de tokens de redefinição de senha via WhatsApp
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);

-- RLS: apenas service role pode ler/escrever (acesso só via Edge Function)
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON password_resets FROM anon, authenticated;
GRANT ALL ON password_resets TO service_role;