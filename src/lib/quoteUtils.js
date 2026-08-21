// Utilitários do módulo de orçamento de cadeiazinhas

export const PRODUCT_CATEGORIES = [
  { id: 'chain', label: 'Modelos de cadeiazinha' },
  { id: 'marian', label: 'Medalhas marianas' },
  { id: 'inox', label: 'Medalhas em inox' },
  { id: 'saint', label: 'Medalhas de santos' },
  { id: 'pendant', label: 'Pingentes' },
  { id: 'medallion', label: 'Medalhões' },
  { id: 'scapular', label: 'Escapulários' }
];

export const ORDER_STATUSES = ['novo', 'em_andamento', 'atendido', 'fechado', 'cancelado'];

export const STATUS_LABEL = {
  novo: 'Novo',
  em_andamento: 'Em andamento',
  atendido: 'Atendido',
  fechado: 'Fechado',
  cancelado: 'Cancelado'
};

export const STATUS_TONE = {
  novo: 'blue',
  em_andamento: 'gold',
  atendido: 'purple',
  fechado: 'green',
  cancelado: 'red'
};

// Busca CEP via ViaCEP
export async function fetchCep(cep) {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || ''
    };
  } catch {
    return null;
  }
}

export function labelOf(list, id) {
  return list.find((x) => (x.slug || x.id) === id)?.label ?? id;
}

// Monta o resumo dos itens do pedido
export function buildItemsSummary(quote, catalog) {
  const lines = [];

  (quote.chains || []).forEach((c, i) => {
    const parts = [];
    if (c.model) parts.push(`Modelo: ${labelOf(catalog.chains, c.model)}`);
    if (c.size) parts.push(`Tamanho: ${c.size}`);
    if (c.freeMedal) parts.push(`Medalha brinde: ${labelOf(catalog.marian, c.freeMedal)}`);
    if (c.marianMedals?.length) parts.push(`Medalhas marianas: ${c.marianMedals.map((m) => labelOf(catalog.marian, m)).join(', ')}`);
    if (c.inoxMedals?.length) parts.push(`Medalhas inox: ${c.inoxMedals.map((m) => labelOf(catalog.inox, m)).join(', ')}`);
    if (c.saintMedals?.length) parts.push(`Medalhas de santos: ${c.saintMedals.map((m) => labelOf(catalog.saint, m)).join(', ')}`);
    if (c.pendants?.length) parts.push(`Pingentes: ${c.pendants.map((m) => labelOf(catalog.pendants, m)).join(', ')}`);
    lines.push(`⛓️ Cadeiazinha ${i + 1}: ${parts.join(' | ')}`);
  });

  (quote.medallions || []).forEach((m) => {
    const label = labelOf(catalog.medallions, m.id);
    lines.push(`🛡️ Medalhão: ${label} (${m.withChain === 'com' ? 'com corrente' : 'sem corrente'})`);
  });

  (quote.scapulars || []).forEach((s) => {
    const label = labelOf(catalog.scapulars, s.id);
    lines.push(`📿 Escapulário: ${label} (qtd: ${s.quantity})`);
  });

  return lines.join('\n');
}

// Monta a mensagem completa do WhatsApp
export function buildWhatsAppMessage(quote, settings, catalog) {
  const address = `${quote.street}, ${quote.number}${quote.complement ? ' - ' + quote.complement : ''}\n${quote.neighborhood} - ${quote.city}/${quote.state}\nCEP: ${quote.cep}`;
  const items = buildItemsSummary(quote, catalog);
  const notes = quote.notes || '';

  const template = settings?.message_template || 'Olá! Gostaria de solicitar um orçamento.\n\nNome: {{name}}\nWhatsApp: {{whatsapp}}\nEndereço: {{address}}\n\nItens:\n{{items}}\n\nObservações: {{notes}}';

  return template
    .replace(/\{\{name\}\}/g, quote.customer_name)
    .replace(/\{\{whatsapp\}\}/g, quote.whatsapp)
    .replace(/\{\{address\}\}/g, address)
    .replace(/\{\{items\}\}/g, items)
    .replace(/\{\{notes\}\}/g, notes || '—');
}

export function newChain() {
  return {
    model: '',
    size: '',
    freeMedal: '',
    marianMedals: [],
    inoxMedals: [],
    saintMedals: [],
    pendants: []
  };
}

// Gera token URL-safe (18 hex chars)
export function generateToken() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Exporta pedidos para CSV
export function exportOrdersCsv(orders) {
  const rows = [
    ['Data', 'Nome', 'WhatsApp', 'CEP', 'Cidade', 'UF', 'Status', 'Observações'],
    ...orders.map((o) => [
      new Date(o.created_date).toLocaleString('pt-BR'),
      o.customer_name,
      o.whatsapp,
      o.cep,
      o.city || '',
      o.state || '',
      STATUS_LABEL[o.status] || o.status,
      (o.notes || '').replace(/\s+/g, ' ')
    ])
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}