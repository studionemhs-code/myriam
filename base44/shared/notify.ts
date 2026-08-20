// Módulo compartilhado para criação de notificações com verificação de preferências.
// Usado por notifyUser (frontend) e dailyReminders (workflow agendado).
export async function notifyUser(base44, userId, category, title, body, link, relatedId) {
  try {
    const u = await base44.asServiceRole.entities.User.get(userId);
    if (u && u.notification_prefs && u.notification_prefs[category] === false) {
      return { skipped: true, reason: 'disabled' };
    }
    await base44.asServiceRole.entities.Notification.create({
      user_id: userId,
      category,
      title,
      body: body || '',
      link: link || '',
      related_id: relatedId || '',
      read: false
    });
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
}