import { json, preflight, currentUser, findProfile } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { user_id } = await req.json();
    if (!user_id) return json({ error: 'Missing user_id' }, 400);

    const target = await findProfile(user_id);
    if (!target) return json({ error: 'Not found' }, 404);

    return json({
      id: target.legacy_id || target.id,
      full_name: target.full_name || '',
      display_name: target.display_name || target.full_name || '',
      photo_url: target.photo_url || '',
      bio: target.bio || '',
      status: target.status || 'interessado'
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});