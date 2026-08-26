import { json, preflight, currentUser, fillTemplate, APP_URL } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user || user.role !== 'admin') return json({ error: 'Forbidden' }, 403);

    const { url, custom_headers, message_template } = await req.json();
    if (!url) return json({ error: 'Missing url' }, 400);

    const samplePayload = {
      remetente_nome: 'Usuário Teste',
      destinatario_nome: 'Destinatário Teste',
      destinatario_email: 'teste@exemplo.com',
      mensagem_texto: 'Esta é uma mensagem de teste do webhook.',
      categoria: 'chat',
      titulo: 'Notificação de Teste',
      corpo: 'Corpo da notificação de teste.',
      link_app: APP_URL,
      conversation_id: 'test-conv-id',
      data: new Date().toISOString()
    };

    const message = fillTemplate(
      message_template || 'Você recebeu uma nova mensagem de {remetente_nome}: {mensagem_texto}',
      samplePayload
    );

    const postBody = {
      message, trigger_type: 'test', ...samplePayload,
      webhook_name: 'Test Webhook', webhook_id: 'test',
      timestamp: new Date().toISOString()
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(custom_headers || {}) },
      body: JSON.stringify(postBody)
    });
    const responseText = await res.text();

    return json({ status: res.status, ok: res.ok, response: responseText.substring(0, 500), sent_body: postBody });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});