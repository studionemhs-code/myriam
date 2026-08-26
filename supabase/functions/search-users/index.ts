import { json, preflight, currentUser, admin } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const payload = await req.json().catch(() => ({}));
    const query = (payload.query || '').toLowerCase();

    const { data } = await admin().from('profiles').select('*').order('created_date', { ascending: false }).limit(500);
    const filtered = (data || [])
      .map((u) => ({ ...u, appId: u.legacy_id || u.id }))
      .filter((u) => u.appId !== user.id && (!query
        || (u.full_name || '').toLowerCase().includes(query)
        || (u.display_name || '').toLowerCase().includes(query)))
      .slice(0, 20)
      .map((u) => ({
        id: u.appId,
        full_name: u.full_name || '',
        display_name: u.display_name || u.full_name || '',
        photo_url: u.photo_url || '',
        status: u.status || 'interessado'
      }));

    return json({ users: filtered });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});