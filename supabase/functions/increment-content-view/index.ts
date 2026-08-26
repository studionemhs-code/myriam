import { json, preflight, currentUser, admin } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { content_id } = await req.json();
    if (!content_id) return json({ error: 'content_id required' }, 400);

    const db = admin();
    const { data: content } = await db.from('acamf_contents').select('view_count').eq('id', content_id).maybeSingle();
    if (!content) return json({ error: 'Content not found' }, 404);

    const newCount = (content.view_count || 0) + 1;
    await db.from('acamf_contents').update({ view_count: newCount }).eq('id', content_id);
    return json({ view_count: newCount });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});