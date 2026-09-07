import { base44 } from '@/api/base44Client';

export const PLATFORM_LABELS = {
  stripe: 'Stripe', hotmart: 'Hotmart', kiwify: 'Kiwify', ticto: 'Ticto',
  infinitepay: 'InfinitePay', link: 'Link de pagamento personalizado', outro: 'Outro checkout externo'
};

export const PRODUCT_TYPE_LABELS = {
  conteudo: 'Conteúdo', curso: 'Curso', modulo: 'Módulo', funcionalidade: 'Funcionalidade', plano: 'Plano',
  assinatura: 'Assinatura', area: 'Área exclusiva', produto_digital: 'Produto digital', evento: 'Evento', outro: 'Outro'
};

export const BILLING_LABELS = {
  unico: 'Pagamento único', assinatura_mensal: 'Assinatura mensal', assinatura_anual: 'Assinatura anual', gratuito: 'Gratuito'
};

export const PAYMENT_STATUS_LABELS = {
  aprovado: 'Aprovado', pendente: 'Pendente', recusado: 'Recusado', cancelado: 'Cancelado',
  reembolsado: 'Reembolsado', chargeback: 'Chargeback', expirado: 'Expirado', renovado: 'Renovado'
};

export const PAYMENT_STATUS_TONES = {
  aprovado: 'green', renovado: 'green', pendente: 'gold', recusado: 'red', cancelado: 'muted',
  reembolsado: 'red', chargeback: 'red', expirado: 'muted'
};

export const EVENT_LABELS = {
  pagamento_aprovado: 'Pagamento aprovado', pagamento_pendente: 'Pagamento pendente', pagamento_recusado: 'Pagamento recusado',
  pagamento_cancelado: 'Cancelamento', pagamento_reembolsado: 'Reembolso', pagamento_chargeback: 'Chargeback',
  pagamento_expirado: 'Expiração', pagamento_renovado: 'Renovação', webhook_rejeitado: 'Webhook rejeitado',
  teste_gratuito_iniciado: 'Teste gratuito iniciado', concessao_manual: 'Concessão manual', acesso_revogado: 'Acesso revogado',
  alteracao_produto: 'Alteração de produto', alteracao_checkout: 'Alteração de checkout', alteracao_configuracao: 'Alteração de configuração'
};

// Registra um evento no histórico de monetização a partir do painel admin.
export async function logMonetizationEvent(event_type, data = {}) {
  const me = await base44.auth.me().catch(() => null);
  return base44.entities.MonetizationEvent.create({
    event_type, actor: me?.email || 'admin', source: 'admin', ...data
  }).catch(() => null);
}

export const fmtDate = (v) => (v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');