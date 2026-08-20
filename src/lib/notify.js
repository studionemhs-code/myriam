import { base44 } from '@/api/base44Client';

// Helper para criar notificações via backend function (verifica preferências do destinatário).
export async function notifyUser({ user_id, category, title, body, link, related_id }) {
  try {
    const res = await base44.functions.invoke('notifyUser', { user_id, category, title, body, link, related_id });
    return res.data;
  } catch (e) {
    return null;
  }
}