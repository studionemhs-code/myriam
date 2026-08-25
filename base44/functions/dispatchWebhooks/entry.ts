import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const APP_URL = 'https://theotokosloja.base44.app';

function fillTemplate(template, payload) {
  let msg = template || '';
  for (const [key, value] of Object.entries(payload)) {
    msg = msg.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value ?? ''));
  }
  return msg;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { trigger_type, entity_id } = body;

    if (!trigger_type || !entity_id) {
      return Response.json({ error: 'Missing trigger_type or entity_id' }, { status: 400 });
    }

    let payload = {};
    let shouldDispatch = false;

    if (trigger_type === 'chat') {
      const msg = await base44.asServiceRole.entities.ChatMessage.get(entity_id);
      if (!msg) return Response.json({ skipped: true, reason: 'message not found' });

      const recipientId = (msg.participants || []).find((p) => p !== msg.sender_id);
      if (!recipientId) return Response.json({ skipped: true, reason: 'no recipient' });

      // Verifica se o destinatário já leu
      if ((msg.read_by || []).includes(recipientId)) {
        return Response.json({ skipped: true, reason: 'recipient already read' });
      }

      const recipient = await base44.asServiceRole.entities.User.get(recipientId);
      payload = {
        remetente_nome: msg.sender_name || 'Alma',
        destinatario_nome: recipient?.display_name || recipient?.full_name || 'Alma',
        destinatario_email: recipient?.email || '',
        mensagem_texto: msg.text || '[Mídia]',
        categoria: 'chat',
        titulo: 'Nova mensagem',
        corpo: msg.text || '',
        link_app: `${APP_URL}/chat/${msg.conversation_id}`,
        conversation_id: msg.conversation_id || '',
        data: new Date().toISOString()
      };
      shouldDispatch = true;
    } else {
      const notif = await base44.asServiceRole.entities.Notification.get(entity_id);
      if (!notif) return Response.json({ skipped: true, reason: 'notification not found' });

      if (notif.read) {
        return Response.json({ skipped: true, reason: 'notification already read' });
      }

      const recipient = notif.user_id ? await base44.asServiceRole.entities.User.get(notif.user_id) : null;
      payload = {
        remetente_nome: 'Theotokos',
        destinatario_nome: recipient?.display_name || recipient?.full_name || 'Alma',
        destinatario_email: recipient?.email || '',
        mensagem_texto: notif.body || '',
        categoria: notif.category || trigger_type,
        titulo: notif.title || '',
        corpo: notif.body || '',
        link_app: notif.link ? `${APP_URL}${notif.link}` : APP_URL,
        conversation_id: '',
        data: new Date().toISOString()
      };
      shouldDispatch = true;
    }

    if (!shouldDispatch) return Response.json({ skipped: true });

    // Busca todos os webhooks ativos que incluem o trigger_type
    const webhooks = await base44.asServiceRole.entities.WebhookAutomation.filter({ enabled: true });
    const matching = webhooks.filter((w) => (w.trigger_types || []).includes(trigger_type));

    if (matching.length === 0) {
      return Response.json({ dispatched: 0, reason: 'no matching webhooks' });
    }

    const results = [];
    for (const webhook of matching) {
      try {
        const message = fillTemplate(webhook.message_template, payload);
        const postBody = {
          message,
          trigger_type,
          ...payload,
          webhook_name: webhook.name,
          webhook_id: webhook.id,
          timestamp: new Date().toISOString()
        };

        const headers = {
          'Content-Type': 'application/json',
          ...(webhook.custom_headers || {})
        };

        const res = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(postBody)
        });

        results.push({
          webhook_id: webhook.id,
          webhook_name: webhook.name,
          status: res.status,
          ok: res.ok
        });
      } catch (e) {
        results.push({
          webhook_id: webhook.id,
          webhook_name: webhook.name,
          error: e.message,
          ok: false
        });
      }
    }

    return Response.json({ dispatched: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}