import { json, preflight, currentUser, notifyUser } from '../_shared/utils.ts';

// Categorias sociais: usuários comuns podem notificar outros usuários.
const SOCIAL_CATEGORIES = ['myriam', 'intencoes'];

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { user_id, category, title, body, link, related_id } = await req.json();
    if (!user_id || !category || !title) return json({ error: 'Missing fields' }, 400);

    if (user_id !== user.id && user.role !== 'admin' && !SOCIAL_CATEGORIES.includes(category)) {
      return json({ error: 'Forbidden: only admins can send system notifications' }, 403);
    }

    return json(await notifyUser(user_id, category, title, body, link, related_id));
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});