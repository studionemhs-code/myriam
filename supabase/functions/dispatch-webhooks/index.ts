import { json, preflight, admin, findProfile, fillTemplate, APP_URL } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const db = admin();
    const { trigger_type, entity_id } = await req.json();
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
        mensagem_texto: msg.text || '[Mídia]',
        categoria: 'chat',
        titulo: 'Nova mensagem',
        corpo: msg.text || '',
        link_app: `${APP_URL}/chat/${msg.conversation_id}`,
        conversation_id: msg.conversation_id || '',
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
    const matching = (webhooks || []).filter((w) => (w.trigger_types || []).includes(trigger_type));
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
        results.push({ webhook_id: webhook.id, webhook_name: webhook.name, status: res.status, ok: res.ok });
      } catch (e) {
        results.push({ webhook_id: webhook.id, webhook_name: webhook.name, error: (e as Error).message, ok: false });
      }
    }
    return json({ dispatched: results.length, results });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});