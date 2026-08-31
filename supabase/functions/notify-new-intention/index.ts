import { json, preflight, currentUser, admin, notifyUser } from '../_shared/utils.ts';

// Avisa todos os membros que uma nova intenção de oração foi publicada.
// Respeita as preferências de notificação (categoria "intencoes") de cada um
// e nunca notifica o próprio autor.
Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { intention_id, text } = await req.json();
    if (!intention_id) return json({ error: 'Missing intention_id' }, 400);

    const authorName = (user.display_name || user.full_name || 'Uma alma').split(' ')[0];
    const title = `${authorName} publicou uma intenção de oração`;
    const body = (text || '').slice(0, 120);

    const { data: profiles } = await admin().from('profiles').select('id, legacy_id').limit(2000);

    let created = 0, skipped = 0;
    for (const p of profiles || []) {
      if (p.id === user.id) continue;
      const result = await notifyUser(p.legacy_id || p.id, 'intencoes', title, body, '/intencoes', intention_id);
      if (result.ok) created++; else if (result.skipped) skipped++;
    }

    return json({ ok: true, created, skipped });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});