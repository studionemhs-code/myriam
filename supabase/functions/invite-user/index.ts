import { json, preflight, currentUser, admin } from '../_shared/utils.ts';

// Gera uma senha temporária aleatória (8 chars: letras + números)
function genPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { email, role = 'user', full_name } = await req.json();
    if (!email) return json({ error: 'E-mail obrigatório' }, 400);

    // Somente admins podem criar administradores.
    if (role === 'admin' && user.role !== 'admin') return json({ error: 'Forbidden' }, 403);

    const password = genPassword();
    const db = admin();

    // Cria o usuário já com senha e e-mail confirmado — pronto para logar.
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: full_name ? { full_name } : undefined,
    });
    if (error) return json({ error: error.message }, 400);

    if (role !== 'user' && data.user) {
      await db.from('profiles').update({ role }).eq('id', data.user.id);
    }
    if (full_name && data.user) {
      await db.from('profiles').update({ full_name }).eq('id', data.user.id);
    }

    return json({ ok: true, user_id: data.user?.id, password });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});