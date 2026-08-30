import { json, preflight, currentUser, admin, notifyUser, fillTemplate, APP_URL } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const isCron = (req.headers.get('Authorization') || '').includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (!isCron) {
      const user = await currentUser(req);
      if (!user || user.role !== 'admin') return json({ error: 'Forbidden' }, 403);
    }

    const { category, title, body, link, video_url, youtube_id, related_id } = await req.json();
    if (!category || !title) return json({ error: 'Missing fields' }, 400);

    // Busca webhooks habilitados que casam com a categoria
    const { data: webhooks } = await admin().from('webhook_automations').select('*').eq('enabled', true);
    const matchingWebhooks = (webhooks || []).filter((w) => (w.trigger_types || []).includes(category));

    const { data: profiles } = await admin().from('profiles').select('id, legacy_id, display_name, full_name, email, phone').limit(500);
    let created = 0, skipped = 0, webhooksDispatched = 0;
    for (const p of profiles || []) {
      const result = await notifyUser(p.legacy_id || p.id, category, title, body, link, related_id, video_url, youtube_id);
      if (result.ok) {
        created++;
        // Dispara webhooks (WhatsApp/externo) se houver automações configuradas para a categoria
        if (matchingWebhooks.length > 0) {
          const payload = {
            remetente_nome: 'Theotokos',
            destinatario_nome: p.display_name || p.full_name || 'Alma',
            destinatario_email: p.email || '',
            destinatario_telefone: p.phone || '',
            mensagem_texto: body || '',
            categoria: category,
            titulo: title,
            corpo: body || '',
            link_app: link ? `${APP_URL}${link}` : APP_URL,
            conversation_id: '',
            data: new Date().toISOString()
          };
          for (const webhook of matchingWebhooks) {
            try {
              const postBody = {
                message: fillTemplate(webhook.message_template, payload),
                ...payload,
                webhook_name: webhook.name, webhook_id: webhook.id,
                timestamp: new Date().toISOString()
              };
              await fetch(webhook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(webhook.custom_headers || {}) },
                body: JSON.stringify(postBody)
              });
              webhooksDispatched++;
            } catch (e) { /* ignore webhook errors */ }
          }
        }
      } else if (result.skipped) skipped++;
    }

    return json({ ok: true, created, skipped, webhooksDispatched, total: (profiles || []).length });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});