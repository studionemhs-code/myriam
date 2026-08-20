import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await req.json();
    const query = (payload.query || '').toLowerCase();
    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const filtered = users
      .filter((u) => u.id !== user.id && (!query || (u.full_name || '').toLowerCase().includes(query)))
      .slice(0, 20)
      .map((u) => ({
        id: u.id,
        full_name: u.full_name || '',
        photo_url: u.photo_url || '',
        status: u.status || 'interessado'
      }));
    return Response.json({ users: filtered });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}