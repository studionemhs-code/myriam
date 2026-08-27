import { json, preflight, admin } from '../_shared/utils.ts';

// Valida o token informado pelo usuário contra o hash armazenado.
// Body: { email, otp_code }
// Resposta: { verified: true } ou { verified: false, error, attempts_remaining?, expired?, blocked? }
Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const body = await req.json();
    const email = body?.email?.trim().toLowerCase();
    const otp_code = body?.otp_code?.trim();

    if (!email || !otp_code) return json({ error: 'email e otp_code são obrigatórios' }, 400);

    const { data: settings } = await admin().from('whatsapp_otp_settings').select('*').limit(1).maybeSingle();
    if (!settings || !settings.enabled) {
      return json({ enabled: false });
    }

    const maxAttempts = settings.max_attempts ?? 5;

    const { data: records } = await admin().from('whatsapp_otps')
      .select('*').eq('email', email).order('created_date', { ascending: false }).limit(1);
    const record = records?.[0];

    if (!record) return json({ verified: false, error: 'Nenhum código encontrado. Recomece o cadastro.' }, 404);
    if (record.verified) return json({ verified: false, error: 'Código já utilizado. Recomece o cadastro.' }, 400);

    const now = new Date();
    if (new Date(record.expires_at) < now) {
      return json({ verified: false, expired: true, error: 'Código expirado. Solicite um novo.' }, 410);
    }

    if ((record.attempts_used ?? 0) >= maxAttempts) {
      return json({ verified: false, blocked: true, error: 'Muitas tentativas inválidas. Recomece o cadastro.' }, 429);
    }

    // Hash do código informado
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(otp_code + email));
    const input_hash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

    if (input_hash !== record.token_hash) {
      const newAttempts = (record.attempts_used ?? 0) + 1;
      await admin().from('whatsapp_otps').update({ attempts_used: newAttempts }).eq('id', record.id);
      const remaining = Math.max(0, maxAttempts - newAttempts);
      return json({ verified: false, error: 'Código incorreto. Verifique e tente novamente.', attempts_remaining: remaining }, 400);
    }

    // Sucesso — marca como verificado
    await admin().from('whatsapp_otps').update({ verified: true }).eq('id', record.id);
    return json({ verified: true });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});