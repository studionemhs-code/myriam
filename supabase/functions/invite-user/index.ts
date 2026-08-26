import { json, preflight, currentUser, admin } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { email, role = 'user' } = await req.json();
    if (!email) return json({ error: 'E-mail obrigatório' }, 400);

    // Somente admins podem convidar administradores.
    if (role === 'admin' && user.role !== 'admin') return json({ error: 'Forbidden' }, 403);

    const db = admin();
    const { data, error } = await db.auth.admin.inviteUserByEmail(email);
    if (error) return json({ error: error.message }, 400);

    if (role !== 'user' && data.user) {
      await db.from('profiles').update({ role }).eq('id', data.user.id);
    }

    return json({ ok: true, user_id: data.user?.id });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});