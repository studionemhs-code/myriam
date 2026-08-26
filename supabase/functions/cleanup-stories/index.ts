import { json, preflight, currentUser, admin } from '../_shared/utils.ts';

// Agendada por cron OU chamada manualmente por admin.
// Chamadas com a service role key (cron) não têm usuário e são permitidas.
Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const isCron = (req.headers.get('Authorization') || '').includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (!isCron) {
      const user = await currentUser(req);
      if (!user || user.role !== 'admin') return json({ error: 'Forbidden' }, 403);
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const db = admin();
    const { data: old } = await db.from('myriam_stories').select('id').lt('created_date', cutoff);
    const ids = (old || []).map((s) => s.id);
    if (ids.length) await db.from('myriam_stories').delete().in('id', ids);

    return json({ ok: true, deleted: ids.length });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});