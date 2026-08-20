import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await req.json();
    const { user_id } = payload;
    if (!user_id) return Response.json({ error: 'Missing user_id' }, { status: 400 });
    let target;
    try {
      target = await base44.asServiceRole.entities.User.get(user_id);
    } catch (e) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    if (!target) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({
      id: target.id,
      full_name: target.full_name || '',
      photo_url: target.photo_url || '',
      bio: target.bio || '',
      status: target.status || 'interessado'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}