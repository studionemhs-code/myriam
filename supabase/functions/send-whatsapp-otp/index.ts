import { json, preflight, admin, fillTemplate } from '../_shared/utils.ts';

// Gera um token de 6 dígitos e dispara o webhook configurado pelo admin.
// Body: { email, whatsapp_number, full_name? }
// Resposta: { enabled: true, sent: true, expires_in } ou { enabled: false } quando desativado.
Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const body = await req.json();
    const email = body?.email?.trim().toLowerCase();
    const whatsapp_number = body?.whatsapp_number?.replace(/\D/g, '');
    const full_name = body?.full_name || '';

    if (!email || !whatsapp_number) return json({ error: 'email e whatsapp_number são obrigatórios' }, 400);

    // Lê as configurações do admin
    const { data: settings } = await admin().from('whatsapp_otp_settings').select('*').limit(1).maybeSingle();
    if (!settings || !settings.enabled) {
      return json({ enabled: false });
    }

    const expirationMinutes = settings.token_expiration_minutes || 5;
    const maxResends = settings.max_resends ?? 3;
    const now = new Date();

    // Verifica se já existe um OTP pendente (não verificado e não expirado) para reenvio
    const { data: existing } = await admin().from('whatsapp_otps')
      .select('*').eq('email', email).order('created_date', { ascending: false }).limit(1);
    const last = existing?.[0];
    const isResend = last && !last.verified && new Date(last.expires_at) > now;

    if (isResend && (last.resends_used ?? 0) >= maxResends) {
      return json({ error: 'Limite de reenvios atingido. Recomece o cadastro.' }, 429);
    }

    // Gera token de 6 dígitos
    const token = String(Math.floor(100000 + Math.random() * 900000));

    // Hash SHA-256 do token + email
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token + email));
    const token_hash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

    const expires_at = new Date(now.getTime() + expirationMinutes * 60000).toISOString();

    if (isResend) {
      await admin().from('whatsapp_otps').update({
        token_hash,
        expires_at,
        whatsapp_number,
        resends_used: (last.resends_used ?? 0) + 1,
        attempts_used: 0
      }).eq('id', last.id);
    } else {
      await admin().from('whatsapp_otps').insert({
        email,
        whatsapp_number,
        token_hash,
        expires_at,
        attempts_used: 0,
        resends_used: 0,
        verified: false
      });
    }

    // Renderiza a mensagem com o template do admin
    const message = fillTemplate(settings.message_template || 'Seu código: {{token}}', {
      token,
      nome: full_name || ''
    });

    // Dispara o webhook (o serviço externo envia a mensagem via WhatsApp)
    try {
      await fetch(settings.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_number, message, token, email })
      });
    } catch (e) {
      console.error('Webhook falhou:', (e as Error).message);
    }

    return json({ enabled: true, sent: true, expires_in: expirationMinutes });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});