import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { notifyUser } from '../../shared/notify.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await req.json();
    const { user_id, category, title, body, link, related_id } = payload;
    if (!user_id || !category || !title) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }
    const result = await notifyUser(base44, user_id, category, title, body, link, related_id);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}