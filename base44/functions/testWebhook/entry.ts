import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

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
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { url, custom_headers, message_template } = body;

    if (!url) return Response.json({ error: 'Missing url' }, { status: 400 });

    const samplePayload = {
      remetente_nome: 'Usuário Teste',
      destinatario_nome: 'Destinatário Teste',
      destinatario_email: 'teste@exemplo.com',
      mensagem_texto: 'Esta é uma mensagem de teste do webhook.',
      categoria: 'chat',
      titulo: 'Notificação de Teste',
      corpo: 'Corpo da notificação de teste.',
      link_app: 'https://theotokosloja.base44.app',
      conversation_id: 'test-conv-id',
      data: new Date().toISOString()
    };

    const message = fillTemplate(
      message_template || 'Você recebeu uma nova mensagem de {remetente_nome}: {mensagem_texto}',
      samplePayload
    );

    const postBody = {
      message,
      trigger_type: 'test',
      ...samplePayload,
      webhook_name: 'Test Webhook',
      webhook_id: 'test',
      timestamp: new Date().toISOString()
    };

    const headers = {
      'Content-Type': 'application/json',
      ...(custom_headers || {})
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(postBody)
    });

    const responseText = await res.text();

    return Response.json({
      status: res.status,
      ok: res.ok,
      response: responseText.substring(0, 500),
      sent_body: postBody
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}