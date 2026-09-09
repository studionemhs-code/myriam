import { json, preflight, admin, fillTemplate, APP_URL } from '../_shared/utils.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeWhatsapp(raw: string): string | null {
  let n = (raw || '').replace(/\D/g, '');
  if (!n) return null;
  if (n.length >= 10 && n.length <= 11 && !n.startsWith('55')) n = '55' + n;
  return n;
}

async function hashToken(token: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token + salt));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function genToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const body = await req.json();
    const identifier = (body?.identifier || '').trim();
    const channel = body?.channel === 'email' ? 'email' : 'whatsapp';
    if (!identifier) return json({ error: 'Informe seu e-mail ou número de WhatsApp.' }, 400);

    const db = admin();
    let userId: string | null = null;
    let whatsappNumber: string | null = null;

    if (EMAIL_RE.test(identifier)) {
      const { data: profile } = await db.from('profiles')
        .select('id, whatsapp_number').ilike('email', identifier).maybeSingle();
      if (!profile) return json({ error: 'Conta não encontrada.' }, 404);
      userId = profile.id;
      whatsappNumber = profile.whatsapp_number ? normalizeWhatsapp(profile.whatsapp_number) : null;
    } else {
      const normalized = normalizeWhatsapp(identifier);
      if (!normalized) return json({ error: 'Número de WhatsApp inválido.' }, 400);
      const { data: profile } = await db.from('profiles')
        .select('id, email, whatsapp_number').eq('whatsapp_number', normalized).maybeSingle();
      if (!profile) return json({ error: 'Conta não encontrada.' }, 404);
      userId = profile.id;
      whatsappNumber = normalized;
    }

    if (!userId) return json({ error: 'Conta não encontrada.' }, 404);

    // Invalida tokens anteriores do usuário
    await db.from('password_resets').update({ used: true }).eq('user_id', userId).eq('used', false);

    const token = genToken();
    const tokenHash = await hashToken(token, userId);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: insertError } = await db.from('password_resets').insert({
      user_id: userId,
      token_hash: tokenHash,
      channel,
      expires_at: expiresAt,
      used: false
    });
    if (insertError) return json({ error: 'Erro ao gerar token.' }, 500);

    if (channel === 'email') {
      const { data: profile } = await db.from('profiles').select('email').eq('id', userId).maybeSingle();
      const email = profile?.email;
      if (!email) return json({ error: 'E-mail não encontrado para esta conta.' }, 404);
      const { error: mailError } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${APP_URL}/reset-password`
      });
      if (mailError) return json({ error: 'Falha ao enviar e-mail de redefinição.' }, 500);
      return json({ success: true, channel: 'email' });
    }

    // Canal WhatsApp: envia link via webhook
    if (!whatsappNumber) {
      return json({ error: 'Esta conta não possui WhatsApp cadastrado. Use a opção por e-mail.' }, 400);
    }

    const { data: settings } = await db.from('whatsapp_otp_settings').select('*').limit(1).maybeSingle();
    if (!settings?.webhook_url) {
      return json({ error: 'Envio por WhatsApp não configurado. Contate o suporte.' }, 500);
    }

    const resetLink = `${APP_URL}/reset-password?token=${token}`;
    const message = fillTemplate(
      'Recebemos uma solicitação para redefinir sua senha no Theotokos. Acesse o link para criar uma nova senha: {{link}}',
      { link: resetLink, token }
    );

    try {
      const res = await fetch(settings.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_number: whatsappNumber, message, reset_link: resetLink, token })
      });
      if (!res.ok) return json({ error: 'Falha ao enviar mensagem via WhatsApp.' }, 500);
    } catch {
      return json({ error: 'Falha ao enviar mensagem via WhatsApp.' }, 500);
    }

    return json({ success: true, channel: 'whatsapp' });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});