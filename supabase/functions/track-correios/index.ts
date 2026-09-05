import { json, preflight, admin, currentUser } from '../_shared/utils.ts';

let cachedToken = '';
let tokenExpiresAt = 0;

const cleanCode = (value: unknown) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
const digits = (value: unknown) => String(value || '').replace(/\D/g, '');

function phoneVariants(value: unknown) {
  const raw = digits(value);
  const local = raw.startsWith('55') ? raw.slice(2) : raw;
  return [...new Set([raw, local, `55${local}`, `+55${local}`].filter(Boolean))];
}

async function correiosToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const usuario = Deno.env.get('CORREIOS_USUARIO')!;
  const senha = Deno.env.get('CORREIOS_SENHA')!;
  const contrato = Deno.env.get('CORREIOS_CONTRATO')!;
  if (!usuario || !senha || !contrato) throw new Error('Credenciais dos Correios não configuradas.');

  const response = await fetch('https://api.correios.com.br/token/v1/autentica/contrato', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${usuario}:${senha}`)}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ numero: contrato })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(body.mensagem || body.message || 'Não foi possível autenticar nos Correios.');
  cachedToken = body.token;
  tokenExpiresAt = body.expiraEm ? new Date(body.expiraEm).getTime() - 60000 : Date.now() + 23 * 60 * 60 * 1000;
  return cachedToken;
}

async function track(code: string) {
  const token = await correiosToken();
  const response = await fetch(`https://api.correios.com.br/srorastro/v1/objetos/${encodeURIComponent(code)}?resultado=T`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.mensagem || body.message || 'Não foi possível consultar o rastreio.');
  const object = body.objetos?.[0];
  if (!object) return null;
  return {
    code: object.codObjeto || code,
    service: object.tipoPostal?.descricao || object.tipoPostal?.categoria || '',
    expected_date: object.dtPrevista || null,
    events: (object.eventos || []).map((event: Record<string, any>) => ({
      code: event.codigo || '',
      type: event.tipo || '',
      date: event.dtHrCriado || '',
      description: event.descricao || '',
      detail: event.detalhe || '',
      location: [event.unidade?.endereco?.cidade, event.unidade?.endereco?.uf].filter(Boolean).join(' / '),
      destination: [event.unidadeDestino?.endereco?.cidade, event.unidadeDestino?.endereco?.uf].filter(Boolean).join(' / ')
    }))
  };
}

async function orderForCurrentUser(req: Request) {
  const user = await currentUser(req);
  if (!user) return null;
  const variants = phoneVariants(user.phone);
  if (!variants.length) return null;
  const { data } = await admin().from('quote_requests').select('id, customer_name, whatsapp, status, tracking_code')
    .in('whatsapp', variants).in('status', ['enviado', 'saiu_para_entrega'])
    .not('tracking_code', 'is', null).order('updated_date', { ascending: false }).limit(1).maybeSingle();
  return data;
}

async function registrationForOrder(order: Record<string, any> | null) {
  if (!order?.whatsapp) return false;
  const { data } = await admin().from('profiles').select('id').in('phone', phoneVariants(order.whatsapp)).limit(1);
  return Boolean(data?.length);
}

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const { data: flag } = await admin().from('feature_flags').select('visible').eq('feature', 'rastreamento_correios').maybeSingle();
    if (flag?.visible === false) return json({ disabled: true, shipment: null });
    const input = await req.json().catch(() => ({}));
    const order = input.mode === 'mine'
      ? await orderForCurrentUser(req)
      : await admin().from('quote_requests').select('id, customer_name, whatsapp, status, tracking_code')
          .eq('tracking_code', cleanCode(input.code)).limit(1).maybeSingle().then(({ data }) => data);
    const code = cleanCode(order?.tracking_code || input.code);
    if (!code) return json({ shipment: null });
    let tracking: Record<string, any> | null = null;
    let trackingError = '';
    try {
      tracking = await track(code);
    } catch (e) {
      trackingError = (e as Error).message;
      if (!order) throw e;
    }
    // Pedido conhecido mas ainda sem dados nos Correios: mostra o código mesmo assim.
    if (!tracking && order) {
      tracking = { code, service: '', expected_date: null, events: [] };
    }
    return json({
      shipment: tracking ? { ...tracking, order_status: order?.status || null, tracking_error: trackingError || null } : null,
      registered: await registrationForOrder(order)
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 502);
  }
});