import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { notifyUser } from '../../shared/notify.ts';

// Categorias sociais: usuários comuns podem enviar notificações a outros usuários
// (ex: curtidas, comentários, mensagens de chat, orações compartilhadas).
const SOCIAL_CATEGORIES = ['myriam', 'intencoes'];

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
    // Segurança: usuários não-admin só podem notificar outros usuários em categorias sociais.
    // Categorias do sistema (caminho, renovacao, acamf, jornadas, novidades) exigem admin.
    if (user_id !== user.id && user.role !== 'admin' && !SOCIAL_CATEGORIES.includes(category)) {
      return Response.json({ error: 'Forbidden: only admins can send system notifications' }, { status: 403 });
    }
    const result = await notifyUser(base44, user_id, category, title, body, link, related_id);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}