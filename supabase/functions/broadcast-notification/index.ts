import { json, preflight, currentUser, admin, notifyUser } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const isCron = (req.headers.get('Authorization') || '').includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (!isCron) {
      const user = await currentUser(req);
      if (!user || user.role !== 'admin') return json({ error: 'Forbidden' }, 403);
    }

    const { category, title, body, link, video_url, youtube_id, related_id } = await req.json();
    if (!category || !title) return json({ error: 'Missing fields' }, 400);

    const { data: profiles } = await admin().from('profiles').select('id, legacy_id').limit(500);
    let created = 0, skipped = 0;
    for (const p of profiles || []) {
      const result = await notifyUser(p.legacy_id || p.id, category, title, body, link, related_id, video_url, youtube_id);
      if (result.ok) created++; else if (result.skipped) skipped++;
    }

    return json({ ok: true, created, skipped, total: (profiles || []).length });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});