import { json, preflight, admin, currentUser, findProfile, fillTemplate, APP_URL } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user || user.role !== 'admin') return json({ error: 'Forbidden' }, 403);

    const db = admin();
    const { trigger_type, entity_id, status, app_url } = await req.json();
    if (!trigger_type || !entity_id) return json({ error: 'Missing trigger_type or entity_id' }, 400);

    let payload: Record<string, unknown>;

    if (trigger_type === 'chat') {
      const { data: msg } = await db.from('chat_messages').select('*').eq('id', entity_id).maybeSingle();
      if (!msg) return json({ skipped: true, reason: 'message not found' });

      const recipientId = (msg.participants || []).find((p: string) => p !== msg.sender_id);
      if (!recipientId) return json({ skipped: true, reason: 'no recipient' });
      if ((msg.read_by || []).includes(recipientId)) {
        return json({ skipped: true, reason: 'recipient already read' });
      }

      const recipient = await findProfile(recipientId);
      payload = {
        remetente_nome: msg.sender_name || 'Alma',
        destinatario_nome: recipient?.display_name || recipient?.full_name || 'Alma',
        destinatario_email: recipient?.email || '',
        destinatario_telefone: recipient?.phone || '',
        mensagem_texto: msg.text || '[Mídia]',
        categoria: 'chat',
        titulo: 'Nova mensagem',
        corpo: msg.text || '',
        link_app: `${APP_URL}/chat/${msg.conversation_id}`,
        conversation_id: msg.conversation_id || '',
        data: new Date().toISOString()
      };
    } else if (trigger_type === 'orcamento') {
      const { data: order } = await db.from('quote_requests').select('*').eq('id', entity_id).maybeSingle();
      if (!order) return json({ skipped: true, reason: 'order not found' });
      const orderStatus = status || order.status;
      const STATUS_TEXT: Record<string, string> = {
        novo: 'Novo', em_andamento: 'Em andamento', enviado: 'Enviado', saiu_para_entrega: 'Saiu para entrega',
        atendido: 'Atendido', fechado: 'Fechado', cancelado: 'Cancelado'
      };
      const statusLabel = STATUS_TEXT[orderStatus] || orderStatus;
      // Normaliza o WhatsApp do cliente para E.164 (+55DDDNÚMERO)
      const digits = String(order.whatsapp || '').replace(/\D/g, '');
      const phoneDigits = digits ? (digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`) : '';
      const phone = phoneDigits ? `+${phoneDigits}` : '';
      const baseUrl = app_url || APP_URL;
      const trackLink = order.tracking_code ? `${baseUrl}/rastreio/${order.tracking_code}` : '';
      const statusText = `Olá, ${order.customer_name || ''}! Seu pedido está com status: ${statusLabel}.${order.tracking_code ? ` Código de rastreio: ${order.tracking_code}.` : ''}${trackLink ? ` Acompanhe em ${trackLink}` : ''}`;
      payload = {
        remetente_nome: 'Theotokos',
        destinatario_nome: order.customer_name || '',
        destinatario_email: '',
        destinatario_telefone: phone,
        destinatario_telefone_digitos: phoneDigits,
        mensagem_texto: statusText,
        categoria: 'orcamento',
        titulo: `Pedido ${statusLabel}`,
        corpo: statusText,
        conversation_id: '',
        cliente_nome: order.customer_name || '',
        cliente_telefone: phone,
        cliente_telefone_digitos: phoneDigits,
        codigo_rastreio: order.tracking_code || '',
        status: orderStatus,
        status_pedido: orderStatus,
        status_label: statusLabel,
        pedido_id: order.id,
        link_app: baseUrl,
        link_rastreio: trackLink,
        data: new Date().toISOString()
      };
    } else {
      const { data: notif } = await db.from('notifications').select('*').eq('id', entity_id).maybeSingle();
      if (!notif) return json({ skipped: true, reason: 'notification not found' });
      if (notif.read) return json({ skipped: true, reason: 'notification already read' });

      const recipient = notif.user_id ? await findProfile(notif.user_id) : null;
      payload = {
        remetente_nome: 'Theotokos',
        destinatario_nome: recipient?.display_name || recipient?.full_name || 'Alma',
        destinatario_email: recipient?.email || '',
        destinatario_telefone: recipient?.phone || '',
        mensagem_texto: notif.body || '',
        categoria: notif.category || trigger_type,
        titulo: notif.title || '',
        corpo: notif.body || '',
        link_app: notif.link ? `${APP_URL}${notif.link}` : APP_URL,
        conversation_id: '',
        data: new Date().toISOString()
      };
    }

    const { data: webhooks } = await db.from('webhook_automations').select('*').eq('enabled', true);
    const matching = (webhooks || []).filter((w) => {
      if (!(w.trigger_types || []).includes(trigger_type)) return false;
      if (trigger_type === 'orcamento') {
        const statuses = w.orcamento_statuses || [];
        return statuses.length === 0 || statuses.includes(payload.status_pedido);
      }
      return true;
    });
    if (!matching.length) return json({ dispatched: 0, reason: 'no matching webhooks' });

    const results = [];
    for (const webhook of matching) {
      try {
        const postBody = {
          message: fillTemplate(webhook.message_template, payload),
          trigger_type, ...payload,
          webhook_name: webhook.name, webhook_id: webhook.id,
          timestamp: new Date().toISOString()
        };
        const res = await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(webhook.custom_headers || {}) },
          body: JSON.stringify(postBody)
        });
        const responseText = res.ok ? '' : (await res.text().catch(() => '')).slice(0, 300);
        results.push({ webhook_id: webhook.id, webhook_name: webhook.name, status: res.status, ok: res.ok, response: responseText });
      } catch (e) {
        results.push({ webhook_id: webhook.id, webhook_name: webhook.name, error: (e as Error).message, ok: false });
      }
    }
    return json({ dispatched: results.length, results });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});