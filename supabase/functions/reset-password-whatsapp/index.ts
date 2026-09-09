import { json, preflight, admin } from '../_shared/utils.ts';

async function hashToken(token: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token + salt));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const body = await req.json();
    const token = body?.token;
    const newPassword = body?.new_password;
    if (!token || !newPassword) return json({ error: 'Token e nova senha são obrigatórios.' }, 400);
    if (newPassword.length < 6) return json({ error: 'A senha deve ter ao menos 6 caracteres.' }, 400);

    const db = admin();
    // Busca tokens não usados, não expirados
    const { data: resets, error } = await db.from('password_resets')
      .select('*').eq('used', false).order('created_date', { ascending: false }).limit(20);
    if (error) return json({ error: 'Erro ao validar token.' }, 500);

    let matched: any = null;
    const now = new Date();
    for (const r of resets || []) {
      if (new Date(r.expires_at) < now) continue;
      const hash = await hashToken(token, r.user_id);
      if (hash === r.token_hash) { matched = r; break; }
    }
    if (!matched) return json({ error: 'Token inválido ou expirado.' }, 400);

    const { error: updError } = await db.auth.admin.updateUserById(matched.user_id, { password: newPassword });
    if (updError) return json({ error: 'Falha ao atualizar senha.' }, 500);

    await db.from('password_resets').update({ used: true }).eq('id', matched.id);
    return json({ success: true });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});