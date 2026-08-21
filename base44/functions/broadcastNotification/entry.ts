import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { notifyUser } from '../../shared/notify.ts';

// Dispara uma notificação para todos os usuários do app.
// Chamado por workflows (sem contexto de usuário) ou pelo painel admin (requer admin).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const payload = await req.json();
    const { category, title, body, link, video_url, youtube_id, related_id } = payload;
    if (!category || !title) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }
    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    let created = 0;
    let skipped = 0;
    for (const u of users) {
      const result = await notifyUser(base44, u.id, category, title, body, link, related_id, video_url, youtube_id);
      if (result.ok) created++;
      else if (result.skipped) skipped++;
    }
    return Response.json({ ok: true, created, skipped, total: users.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}