import { json, preflight, admin } from '../_shared/utils.ts';
import { adapters, verifySignature } from '../_shared/payment-adapters.ts';

// Recebe notificações de pagamento: POST /payment-webhook?integration=<id>[&product=<id>]
// Fluxo: Integração → normaliza evento → registra Pagamento → cria/atualiza Permissão → registra Histórico.

const ACTIVATE = ['aprovado', 'renovado'];
const REVOKE: Record<string, string> = { reembolsado: 'cancelado', chargeback: 'revogado', cancelado: 'cancelado', expirado: 'expirado' };

async function logEvent(db: any, e: Record<string, unknown>) {
  await db.from('monetization_events').insert({ actor: 'webhook', ...e });
}

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  const url = new URL(req.url);
  const db = admin();
  const integrationId = url.searchParams.get('integration');
  if (!integrationId) return json({ error: 'Parâmetro "integration" obrigatório.' }, 400);

  const rawBody = await req.text();
  let body: any = {};
  try { body = JSON.parse(rawBody); } catch { body = Object.fromEntries(new URLSearchParams(rawBody)); }

  const { data: integration } = await db.from('payment_integrations').select('*').eq('id', integrationId).maybeSingle();
  if (!integration || !integration.enabled) return json({ error: 'Integração não encontrada ou desativada.' }, 404);

  const valid = await verifySignature(integration.platform, req, rawBody, integration.webhook_secret, url, body);
  if (!valid) {
    await logEvent(db, { event_type: 'webhook_rejeitado', platform: integration.platform, details: { reason: 'assinatura inválida' } });
    return json({ error: 'Assinatura inválida.' }, 401);
  }

  const adapter = adapters[integration.platform] || adapters.generico;
  const n = adapter(body);
  const email = String(n.email || '').trim().toLowerCase();

  // 1) Produto: parâmetro explícito > id externo cadastrado no produto
  let product: any = null;
  const qp = url.searchParams.get('product');
  if (qp) product = (await db.from('products').select('*').eq('id', qp).maybeSingle()).data;
  if (!product && n.external_product_id) {
    const { data } = await db.from('products').select('*').eq('integration_id', integration.id).eq('external_product_id', n.external_product_id).limit(1);
    product = data?.[0] || null;
  }
  // Fallback: tenta casar pelo external_offer_id (algumas plataformas enviam offer_id em vez de product_id)
  if (!product && n.external_offer_id) {
    const { data } = await db.from('products').select('*').eq('integration_id', integration.id).eq('external_product_id', n.external_offer_id).limit(1);
    product = data?.[0] || null;
  }
  // Fallback: tenta casar pelo código de checkout embutido na URL do produto
  if (!product && n.checkout_code) {
    const { data } = await db.from('products').select('*').eq('integration_id', integration.id).ilike('checkout_url', `%${n.checkout_code}%`).limit(1);
    product = data?.[0] || null;
  }

  // 2) Comprador (pode ainda não ter conta — a permissão fica vinculada ao e-mail)
  let profile: any = null;
  if (email) {
    const { data } = await db.from('profiles').select('id, email, full_name').ilike('email', email).limit(1);
    profile = data?.[0] || null;
  }

  // 3) Pagamento (idempotente por plataforma + transação)
  const paymentRow = {
    user_id: profile?.id || null, user_email: email || null, user_name: n.name || profile?.full_name || null,
    product_id: product?.id || null, integration_id: integration.id, platform: integration.platform,
    external_transaction_id: n.external_transaction_id || null, external_product_id: n.external_product_id || null,
    event_type: n.event_type, status: n.status, amount: n.amount, currency: n.currency, raw_payload: body,
    processed_at: new Date().toISOString()
  };
  let payment: any = null;
  if (n.external_transaction_id) {
    const { data } = await db.from('payments').select('id').eq('platform', integration.platform).eq('external_transaction_id', n.external_transaction_id).limit(1);
    if (data?.[0]) payment = (await db.from('payments').update(paymentRow).eq('id', data[0].id).select().single()).data;
  }
  if (!payment) payment = (await db.from('payments').insert(paymentRow).select().single()).data;

  // 4) Permissão de acesso
  let grant: any = null;
  if (product && (profile || email)) {
    const ownerFilter = profile ? { user_id: profile.id } : { user_email: email };
    const source = product.billing_type?.startsWith('assinatura') ? 'assinatura' : 'compra';
    const { data: existing } = await db.from('access_grants').select('*').match({ product_id: product.id, ...ownerFilter })
      .in('source', ['compra', 'assinatura']).order('created_date', { ascending: false }).limit(1);
    const current = existing?.[0] || null;

    if (ACTIVATE.includes(n.status)) {
      const expires = product.access_duration_days
        ? new Date(Date.now() + product.access_duration_days * 86400000).toISOString() : null;
      const row = {
        user_id: profile?.id || null, user_email: email || null, product_id: product.id, source, status: 'ativo',
        starts_at: new Date().toISOString(), expires_at: expires, payment_id: payment?.id || null,
        platform: integration.platform, granted_by: 'webhook', note: `Evento ${n.event_type}`
      };
      grant = current
        ? (await db.from('access_grants').update(row).eq('id', current.id).select().single()).data
        : (await db.from('access_grants').insert(row).select().single()).data;
    } else if (REVOKE[n.status] && current) {
      grant = (await db.from('access_grants').update({ status: REVOKE[n.status], payment_id: payment?.id || null, note: `Evento ${n.event_type}` })
        .eq('id', current.id).select().single()).data;
    } else if (n.status === 'pendente' && !current) {
      grant = (await db.from('access_grants').insert({
        user_id: profile?.id || null, user_email: email || null, product_id: product.id, source, status: 'pendente',
        payment_id: payment?.id || null, platform: integration.platform, granted_by: 'webhook', note: `Evento ${n.event_type}`
      }).select().single()).data;
    }
  }

  // 5) Histórico
  await logEvent(db, {
    event_type: `pagamento_${n.status}`, user_id: profile?.id || null, user_email: email || null,
    product_id: product?.id || null, payment_id: payment?.id || null, grant_id: grant?.id || null,
    source: 'webhook', platform: integration.platform, external_transaction_id: n.external_transaction_id || null,
    details: { event_type: n.event_type, amount: n.amount, product_found: !!product, user_found: !!profile, grant_status: grant?.status || null }
  });

  return json({ ok: true, status: n.status, product_found: !!product, user_found: !!profile, grant_status: grant?.status || null });
});