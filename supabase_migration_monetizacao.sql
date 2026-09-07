-- ============================================================================
-- 16. MONETIZAÇÃO E CONTROLE DE ACESSO
-- Produto → Checkout (Integração) → Pagamento → Permissão (Access Grant) → Recurso
-- ============================================================================

-- Configurações gerais (singleton)
CREATE TABLE IF NOT EXISTS public.monetization_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date          TIMESTAMPTZ DEFAULT now(),
  updated_date          TIMESTAMPTZ DEFAULT now(),
  created_by_id         UUID,
  access_model          TEXT NOT NULL DEFAULT 'hibrido' CHECK (access_model IN ('gratuito', 'pago', 'hibrido')),
  paid_app_product_id   TEXT,
  trial_enabled         BOOLEAN NOT NULL DEFAULT false,
  trial_enabled_at      TIMESTAMPTZ,
  trial_days            INTEGER NOT NULL DEFAULT 7,
  trial_audience        TEXT NOT NULL DEFAULT 'novos' CHECK (trial_audience IN ('todos', 'novos')),
  trial_once_per_user   BOOLEAN NOT NULL DEFAULT true,
  trial_scope           TEXT NOT NULL DEFAULT 'tudo' CHECK (trial_scope IN ('tudo', 'produtos')),
  trial_product_ids     TEXT[] DEFAULT '{}',
  paywall_title         TEXT NOT NULL DEFAULT 'Conteúdo exclusivo',
  paywall_message       TEXT NOT NULL DEFAULT 'Este conteúdo está disponível para usuários com acesso Premium.',
  paywall_button_label  TEXT NOT NULL DEFAULT 'Ver acesso'
);

-- Integrações de pagamento (Stripe, Hotmart, Kiwify, Ticto, InfinitePay, outros)
CREATE TABLE IF NOT EXISTS public.payment_integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  name            TEXT NOT NULL,
  platform        TEXT NOT NULL DEFAULT 'outro' CHECK (platform IN ('stripe', 'hotmart', 'kiwify', 'ticto', 'infinitepay', 'link', 'outro')),
  checkout_mode   TEXT NOT NULL DEFAULT 'externo' CHECK (checkout_mode IN ('nativo', 'externo')),
  enabled         BOOLEAN NOT NULL DEFAULT true,
  webhook_secret  TEXT,
  config          JSONB DEFAULT '{}',
  notes           TEXT
);

-- Produtos / ofertas monetizáveis
CREATE TABLE IF NOT EXISTS public.products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date          TIMESTAMPTZ DEFAULT now(),
  updated_date          TIMESTAMPTZ DEFAULT now(),
  created_by_id         UUID,
  name                  TEXT NOT NULL,
  description           TEXT,
  product_type          TEXT NOT NULL DEFAULT 'conteudo' CHECK (product_type IN ('conteudo', 'curso', 'modulo', 'funcionalidade', 'plano', 'assinatura', 'area', 'produto_digital', 'evento', 'outro')),
  price                 NUMERIC(12,2) DEFAULT 0,
  currency              TEXT NOT NULL DEFAULT 'BRL',
  billing_type          TEXT NOT NULL DEFAULT 'unico' CHECK (billing_type IN ('unico', 'assinatura_mensal', 'assinatura_anual', 'gratuito')),
  access_duration_days  INTEGER,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  integration_id        TEXT,
  checkout_url          TEXT,
  external_product_id   TEXT,
  image_url             TEXT
);

-- Recursos liberados por cada produto (1 produto → N recursos)
CREATE TABLE IF NOT EXISTS public.product_resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  product_id      TEXT NOT NULL,
  resource_type   TEXT NOT NULL CHECK (resource_type IN ('acamf_content', 'course', 'feature', 'app')),
  resource_id     TEXT NOT NULL
);

-- Permissões de acesso (quem acessa o quê, por quanto tempo e por qual motivo)
CREATE TABLE IF NOT EXISTS public.access_grants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  user_id         UUID,
  user_email      TEXT,
  product_id      TEXT,
  resource_type   TEXT,
  resource_id     TEXT,
  source          TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('compra', 'assinatura', 'teste_gratuito', 'manual', 'cortesia')),
  status          TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pendente', 'expirado', 'cancelado', 'revogado')),
  starts_at       TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  payment_id      TEXT,
  platform        TEXT,
  note            TEXT,
  granted_by      TEXT
);

-- Pagamentos registrados (vindos dos webhooks ou lançados manualmente)
CREATE TABLE IF NOT EXISTS public.payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date            TIMESTAMPTZ DEFAULT now(),
  updated_date            TIMESTAMPTZ DEFAULT now(),
  created_by_id           UUID,
  user_id                 UUID,
  user_email              TEXT,
  user_name               TEXT,
  product_id              TEXT,
  integration_id          TEXT,
  platform                TEXT,
  external_transaction_id TEXT,
  external_product_id     TEXT,
  event_type              TEXT,
  status                  TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('aprovado', 'pendente', 'recusado', 'cancelado', 'reembolsado', 'chargeback', 'expirado', 'renovado')),
  amount                  NUMERIC(12,2),
  currency                TEXT DEFAULT 'BRL',
  raw_payload             JSONB,
  processed_at            TIMESTAMPTZ DEFAULT now()
);

-- Histórico / auditoria de monetização
CREATE TABLE IF NOT EXISTS public.monetization_events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date            TIMESTAMPTZ DEFAULT now(),
  updated_date            TIMESTAMPTZ DEFAULT now(),
  created_by_id           UUID,
  event_type              TEXT NOT NULL,
  user_id                 UUID,
  user_email              TEXT,
  product_id              TEXT,
  payment_id              TEXT,
  grant_id                TEXT,
  source                  TEXT,
  platform                TEXT,
  external_transaction_id TEXT,
  actor                   TEXT,
  details                 JSONB DEFAULT '{}'
);

-- Períodos de teste gratuito por usuário (um registro por usuário)
CREATE TABLE IF NOT EXISTS public.user_trials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID,
  user_id         UUID NOT NULL UNIQUE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at         TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'expirado', 'cancelado')),
  product_ids     TEXT[] DEFAULT '{}'
);

-- Tipo de acesso nos recursos existentes (padrão: gratuito)
ALTER TABLE public.acamf_contents ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'gratuito' CHECK (access_type IN ('gratuito', 'pago'));
ALTER TABLE public.acamf_contents ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'gratuito' CHECK (access_type IN ('gratuito', 'pago'));
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE public.feature_flags ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'gratuito' CHECK (access_type IN ('gratuito', 'pago'));
ALTER TABLE public.feature_flags ADD COLUMN IF NOT EXISTS product_id TEXT;

-- RLS
ALTER TABLE public.monetization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monet_settings_read" ON public.monetization_settings FOR SELECT USING (true);
CREATE POLICY "monet_settings_insert" ON public.monetization_settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "monet_settings_update" ON public.monetization_settings FOR UPDATE USING (is_admin());
CREATE POLICY "monet_settings_delete" ON public.monetization_settings FOR DELETE USING (is_admin());

ALTER TABLE public.payment_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay_int_read" ON public.payment_integrations FOR SELECT USING (is_admin());
CREATE POLICY "pay_int_insert" ON public.payment_integrations FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "pay_int_update" ON public.payment_integrations FOR UPDATE USING (is_admin());
CREATE POLICY "pay_int_delete" ON public.payment_integrations FOR DELETE USING (is_admin());

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_insert" ON public.products FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "products_update" ON public.products FOR UPDATE USING (is_admin());
CREATE POLICY "products_delete" ON public.products FOR DELETE USING (is_admin());

ALTER TABLE public.product_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod_res_read" ON public.product_resources FOR SELECT USING (true);
CREATE POLICY "prod_res_insert" ON public.product_resources FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "prod_res_update" ON public.product_resources FOR UPDATE USING (is_admin());
CREATE POLICY "prod_res_delete" ON public.product_resources FOR DELETE USING (is_admin());

ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grants_read" ON public.access_grants FOR SELECT
  USING (user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email') OR is_admin());
CREATE POLICY "grants_insert" ON public.access_grants FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "grants_update" ON public.access_grants FOR UPDATE USING (is_admin());
CREATE POLICY "grants_delete" ON public.access_grants FOR DELETE USING (is_admin());

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_read" ON public.payments FOR SELECT
  USING (user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email') OR is_admin());
CREATE POLICY "payments_insert" ON public.payments FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "payments_update" ON public.payments FOR UPDATE USING (is_admin());
CREATE POLICY "payments_delete" ON public.payments FOR DELETE USING (is_admin());

ALTER TABLE public.monetization_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monet_events_read" ON public.monetization_events FOR SELECT USING (is_admin());
CREATE POLICY "monet_events_insert" ON public.monetization_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "monet_events_update" ON public.monetization_events FOR UPDATE USING (is_admin());
CREATE POLICY "monet_events_delete" ON public.monetization_events FOR DELETE USING (is_admin());

ALTER TABLE public.user_trials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trials_read" ON public.user_trials FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "trials_insert" ON public.user_trials FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY "trials_update" ON public.user_trials FOR UPDATE USING (is_admin());
CREATE POLICY "trials_delete" ON public.user_trials FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- Triggers (updated_date + created_by_id)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['monetization_settings','payment_integrations','products','product_resources','access_grants','payments','monetization_events','user_trials']
  LOOP
    BEGIN
      EXECUTE format('CREATE TRIGGER set_updated_date_%s BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.update_updated_date();', t, t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format('CREATE TRIGGER set_created_by_%s BEFORE INSERT ON public.%s FOR EACH ROW EXECUTE FUNCTION public.set_created_by();', t, t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;
END $$;

-- Seed das configurações (modelo híbrido, teste desativado)
INSERT INTO public.monetization_settings (access_model)
SELECT 'hibrido' WHERE NOT EXISTS (SELECT 1 FROM public.monetization_settings);

-- Índices
CREATE INDEX IF NOT EXISTS idx_product_resources_product ON public.product_resources(product_id);
CREATE INDEX IF NOT EXISTS idx_product_resources_resource ON public.product_resources(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_user ON public.access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_email ON public.access_grants(lower(user_email));
CREATE INDEX IF NOT EXISTS idx_access_grants_product ON public.access_grants(product_id);
CREATE INDEX IF NOT EXISTS idx_payments_tx ON public.payments(platform, external_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_products_external ON public.products(integration_id, external_product_id);
CREATE INDEX IF NOT EXISTS idx_monet_events_created ON public.monetization_events(created_date DESC);