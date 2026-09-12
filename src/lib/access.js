// Regras puras de acesso: Produto → Permissão → Recurso.
// Um recurso é { type: 'acamf_content'|'course'|'feature'|'app', id, access_type, product_id }.

export const RESOURCE_TYPE_LABELS = {
  acamf_content: 'Conteúdo ACAMF',
  course: 'Curso',
  feature: 'Funcionalidade',
  app: 'Aplicativo',
  background_playback: 'Reprodução em 2º plano',
  offline_download: 'Download Offline'
};

export const GRANT_SOURCE_LABELS = {
  compra: 'Compra',
  assinatura: 'Assinatura',
  teste_gratuito: 'Teste gratuito',
  manual: 'Liberação manual',
  cortesia: 'Cortesia'
};

export const GRANT_STATUS_LABELS = {
  ativo: 'Ativo',
  pendente: 'Pendente',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
  revogado: 'Revogado'
};

export const isGrantActive = (g, now = Date.now()) =>
  g.status === 'ativo' &&
  (!g.starts_at || new Date(g.starts_at).getTime() <= now) &&
  (!g.expires_at || new Date(g.expires_at).getTime() > now);

export const isTrialActive = (t, now = Date.now()) =>
  !!t && t.status === 'ativo' && new Date(t.ends_at).getTime() > now;

// Produtos que liberam um recurso: o product_id direto + os mapeados em product_resources.
export function unlockingProductIds(resource, productResources = [], settings) {
  const direct = resource.type === 'app' ? settings?.paid_app_product_id : resource.product_id;
  const mapped = productResources
    .filter((pr) => pr.resource_type === resource.type && String(pr.resource_id) === String(resource.id))
    .map((pr) => pr.product_id);
  return [...new Set([direct, ...mapped].filter(Boolean))];
}

export function resolveAccess({ user, settings, grants = [], trial, productResources = [], resource }) {
  if (user?.role === 'admin') return { allowed: true, reason: 'admin' };
  const model = settings?.access_model || 'hibrido';
  const isPaid = resource.type === 'app'
    ? model === 'pago' && !!settings?.paid_app_product_id
    : model !== 'gratuito' && resource.access_type === 'pago';
  if (!isPaid) return { allowed: true, reason: 'gratuito' };

  const products = unlockingProductIds(resource, productResources, settings);
  const now = Date.now();
  const grant = grants.find((g) =>
    isGrantActive(g, now) && (
      (g.product_id && products.includes(g.product_id)) ||
      (g.resource_type === resource.type && String(g.resource_id) === String(resource.id))
    )
  );
  if (grant) return { allowed: true, reason: grant.source, grant, productIds: products };

  if (settings?.trial_enabled && isTrialActive(trial, now)) {
    const inScope = settings.trial_scope !== 'produtos' ||
      (settings.trial_product_ids || []).some((id) => products.includes(id));
    if (inScope) return { allowed: true, reason: 'teste_gratuito', trial, productIds: products };
  }

  return { allowed: false, reason: 'bloqueado', productIds: products, resource };
}

// Usuário pode iniciar o teste gratuito?
export function trialEligibility({ user, settings, trial }) {
  if (!user || !settings?.trial_enabled) return false;
  if (trial) {
    if (settings.trial_once_per_user) return false;
    if (isTrialActive(trial)) return false;
  }
  if (settings.trial_audience === 'novos' && settings.trial_enabled_at) {
    const created = new Date(user.created_date || 0).getTime();
    if (created < new Date(settings.trial_enabled_at).getTime()) return false;
  }
  return true;
}

export const formatPrice = (value, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value || 0));