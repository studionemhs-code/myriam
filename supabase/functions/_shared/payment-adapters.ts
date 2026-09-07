// Adaptadores por plataforma: transformam o payload de cada webhook num evento normalizado.
// Para adicionar uma plataforma, basta incluir um novo adaptador e (opcionalmente) verificação de assinatura.

export type NormalizedPayment = {
  status: 'aprovado' | 'pendente' | 'recusado' | 'cancelado' | 'reembolsado' | 'chargeback' | 'expirado' | 'renovado';
  email: string;
  name?: string;
  external_transaction_id: string;
  external_product_id: string;
  external_offer_id?: string;
  checkout_code?: string;
  amount: number | null;
  currency: string;
  event_type: string;
};

const KNOWN = ['aprovado', 'pendente', 'recusado', 'cancelado', 'reembolsado', 'chargeback', 'expirado', 'renovado'];
const norm = (s: unknown, table: Record<string, NormalizedPayment['status']>) =>
  table[String(s || '').toLowerCase()] || (KNOWN.includes(String(s)) ? String(s) as NormalizedPayment['status'] : 'pendente');
const cents = (v: unknown) => (v == null || v === '' ? null : Number(v) / 100);

export const adapters: Record<string, (b: any) => NormalizedPayment> = {
  hotmart: (b) => {
    const d = b.data || {};
    return {
      status: norm(b.event, {
        purchase_approved: 'aprovado', purchase_complete: 'aprovado', purchase_billet_printed: 'pendente',
        purchase_delayed: 'pendente', purchase_canceled: 'cancelado', purchase_refunded: 'reembolsado',
        purchase_chargeback: 'chargeback', purchase_protest: 'chargeback', purchase_expired: 'expirado',
        subscription_cancellation: 'cancelado', switch_plan: 'renovado'
      }),
      email: d.buyer?.email || '', name: d.buyer?.name,
      external_transaction_id: d.purchase?.transaction || '',
      external_product_id: String(d.product?.id ?? ''),
      amount: d.purchase?.price?.value ?? null, currency: d.purchase?.price?.currency_value || 'BRL',
      event_type: b.event || ''
    };
  },
  kiwify: (b) => ({
    status: norm(b.order_status || b.webhook_event_type, {
      paid: 'aprovado', approved: 'aprovado', waiting_payment: 'pendente', refused: 'recusado',
      refunded: 'reembolsado', chargedback: 'chargeback', canceled: 'cancelado', expired: 'expirado',
      subscription_renewed: 'renovado', subscription_canceled: 'cancelado', subscription_late: 'pendente'
    }),
    email: b.Customer?.email || '', name: b.Customer?.full_name,
    external_transaction_id: b.order_id || '',
    external_product_id: String(b.Product?.product_id ?? ''),
    amount: cents(b.Commissions?.charge_amount), currency: b.Commissions?.currency || 'BRL',
    event_type: b.webhook_event_type || b.order_status || ''
  }),
  ticto: (b) => ({
    status: norm(b.status, {
      authorized: 'aprovado', paid: 'aprovado', waiting_payment: 'pendente', refused: 'recusado',
      refunded: 'reembolsado', chargeback: 'chargeback', canceled: 'cancelado', abandoned_cart: 'pendente',
      subscription_canceled: 'cancelado', subscription_delayed: 'pendente', subscription_renewed: 'renovado', expired: 'expirado'
    }),
    email: b.customer?.email || '', name: b.customer?.name,
    external_transaction_id: b.transaction?.hash || b.order?.hash || '',
    external_product_id: String(b.item?.product_id ?? b.product?.id ?? ''),
    external_offer_id: b.item?.offer_id ? String(b.item.offer_id) : undefined,
    checkout_code: b.url_params?.query_params?.code || undefined,
    amount: cents(b.order?.paid_amount ?? b.item?.amount), currency: 'BRL',
    event_type: b.status || ''
  }),
  infinitepay: (b) => ({
    status: norm(b.status || (b.paid ? 'paid' : ''), {
      paid: 'aprovado', approved: 'aprovado', pending: 'pendente', refused: 'recusado',
      refunded: 'reembolsado', chargeback: 'chargeback', canceled: 'cancelado', expired: 'expirado'
    }),
    email: b.customer?.email || b.email || '', name: b.customer?.name,
    external_transaction_id: b.transaction_nsu || b.order_nsu || b.id || '',
    external_product_id: String(b.items?.[0]?.id ?? b.product_id ?? ''),
    amount: cents(b.amount ?? b.paid_amount), currency: 'BRL',
    event_type: b.event || b.status || ''
  }),
  stripe: (b) => {
    const o = b.data?.object || {};
    const type = String(b.type || '');
    const status = norm(type, {
      'checkout.session.completed': o.payment_status === 'paid' ? 'aprovado' : 'pendente',
      'checkout.session.async_payment_succeeded': 'aprovado', 'checkout.session.async_payment_failed': 'recusado',
      'invoice.paid': 'renovado', 'invoice.payment_failed': 'recusado', 'charge.refunded': 'reembolsado',
      'charge.dispute.created': 'chargeback', 'customer.subscription.deleted': 'cancelado', 'payment_intent.succeeded': 'aprovado'
    });
    return {
      status, email: o.customer_details?.email || o.customer_email || o.receipt_email || '',
      name: o.customer_details?.name,
      external_transaction_id: o.payment_intent || o.subscription || o.id || '',
      external_product_id: o.metadata?.product_id || o.client_reference_id || '',
      amount: cents(o.amount_total ?? o.amount_paid ?? o.amount), currency: (o.currency || 'brl').toUpperCase(),
      event_type: type
    };
  },
  // Formato genérico para "outro checkout" / link personalizado / automações (n8n, Make, Zapier):
  // { status, email, name, transaction_id, product_id, amount, currency }
  generico: (b) => ({
    status: norm(b.status, { paid: 'aprovado', approved: 'aprovado', pending: 'pendente', refused: 'recusado', refunded: 'reembolsado', canceled: 'cancelado', chargeback: 'chargeback', expired: 'expirado', renewed: 'renovado' }),
    email: b.email || b.customer_email || '', name: b.name,
    external_transaction_id: String(b.transaction_id || b.external_transaction_id || b.id || ''),
    external_product_id: String(b.product_id || b.external_product_id || ''),
    amount: b.amount != null ? Number(b.amount) : null, currency: b.currency || 'BRL',
    event_type: b.event || b.status || ''
  })
};

async function hmacHex(algo: 'SHA-256' | 'SHA-1', secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: algo }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Verifica a autenticidade do webhook conforme a plataforma. Sem segredo configurado, aceita.
export async function verifySignature(platform: string, req: Request, rawBody: string, secret: string | null, url: URL, body: any) {
  if (!secret) return true;
  switch (platform) {
    case 'hotmart':
      return req.headers.get('x-hotmart-hottok') === secret;
    case 'stripe': {
      const header = req.headers.get('stripe-signature') || '';
      const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
      if (!parts.t || !parts.v1) return false;
      return (await hmacHex('SHA-256', secret, `${parts.t}.${rawBody}`)) === parts.v1;
    }
    case 'kiwify':
      return (url.searchParams.get('signature') || '') === (await hmacHex('SHA-1', secret, rawBody));
    case 'ticto':
      return body?.token === secret || req.headers.get('x-webhook-secret') === secret;
    default:
      return req.headers.get('x-webhook-secret') === secret || url.searchParams.get('token') === secret || body?.token === secret;
  }
}