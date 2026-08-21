import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { notifyUser } from '../../shared/notify.ts';

// Função agendada por workflow (sem contexto de usuário) OU chamada manualmente por admin.
// Se chamada por um usuário autenticado, exige perfil de admin.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const allProgress = await base44.asServiceRole.entities.UserProgress.list('-created_date', 500);
    const progressByUser = {};
    for (const p of allProgress) {
      progressByUser[p.created_by_id] = p;
    }
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let created = 0;

    for (const u of users) {
      // Aniversário anual da consagração
      if (u.consecration_date) {
        const cDate = new Date(u.consecration_date + 'T00:00:00');
        const thisYear = new Date(today.getFullYear(), cDate.getMonth(), cDate.getDate());
        const diff = Math.round((thisYear - todayMidnight) / 86400000);
        if (diff === 0) {
          await notifyUser(base44, u.id, 'renovacao', 'Dia da sua Consagração',
            'Hoje celebramos o dia da sua Total Consagração. Glória a Deus!', '/minha-consagracao');
          created++;
        }
      }
      // Lembretes de renovação (consagrados)
      if (u.status === 'consagrado' && u.consecration_date) {
        const base = u.last_renewal_date
          ? new Date(u.last_renewal_date + 'T00:00:00')
          : new Date(u.consecration_date + 'T00:00:00');
        let renewal = new Date(base);
        renewal.setFullYear(today.getFullYear());
        if (renewal < todayMidnight) renewal.setFullYear(today.getFullYear() + 1);
        const diff = Math.round((renewal - todayMidnight) / 86400000);
        if (diff === 7) {
          await notifyUser(base44, u.id, 'renovacao', 'Sua renovação se aproxima',
            'Faltam 7 dias para a sua renovação anual da Consagração.', '/minha-consagracao');
          created++;
        } else if (diff === 0) {
          await notifyUser(base44, u.id, 'renovacao', 'Hoje é o dia da sua renovação',
            'Hoje é o dia de renovar sua Total Consagração a Jesus por Maria.', '/minha-consagracao');
          created++;
        }
      }
      // Consagração prevista (em preparação)
      if (u.status === 'preparacao' && u.target_consecration_date) {
        const target = new Date(u.target_consecration_date + 'T00:00:00');
        const diff = Math.round((target - todayMidnight) / 86400000);
        if (diff === 7) {
          await notifyUser(base44, u.id, 'caminho', 'Sua consagração se aproxima',
            'Faltam 7 dias para a data prevista da sua Consagração.', '/caminho');
          created++;
        } else if (diff === 0) {
          await notifyUser(base44, u.id, 'caminho', 'Hoje é o dia da sua Consagração',
            'Que Maria te conduza hoje ao ato de Consagração.', '/consagracao');
          created++;
        }
      }
      // Lembrete diário de oração (em preparação, dia atual não concluído)
      if (u.status === 'preparacao') {
        const progress = progressByUser[u.id];
        if (progress && progress.status === 'ativa' && progress.current_day <= 33) {
          const completedDays = progress.completed_days || [];
          if (!completedDays.includes(progress.current_day)) {
            await notifyUser(base44, u.id, 'caminho', 'Não esqueça sua oração de hoje',
              `Você ainda não concluiu o Dia ${progress.current_day} da sua preparação. Reserve um momento para rezar.`, '/caminho');
            created++;
          }
        }
      }
    }
    return Response.json({ ok: true, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}