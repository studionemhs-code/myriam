import { json, preflight, admin } from '../_shared/utils.ts';
import { sendProactiveAgentMessage, countProactiveToday } from '../_shared/proactiveAgent.ts';

// Lembretes contextuais (follow-up ao longo do dia).
// Roda a cada hora via pg_cron. Só envia entre 10:00 e 20:00 (horário local do servidor UTC).
// Anti-spam: máximo 3 mensagens proativas/dia/usuário (compartilhado com o resumo matinal).

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const isCron = (req.headers.get('Authorization') || '').includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (!isCron) {
      return json({ error: 'Forbidden' }, 403);
    }

    const db = admin();
    const now = new Date();
    const hourUTC = now.getUTCHours();
    // Janela de envio: 10:00–20:00 UTC (~07:00–17:00 BRT-3). Não incomoda de madrugada.
    if (hourUTC < 10 || hourUTC >= 20) {
      return json({ ok: true, skipped: 'fora da janela' });
    }

    const { data: profiles } = await db.from('profiles')
      .select('id,status,display_name,full_name,agent_proactive_enabled,notification_prefs')
      .limit(500);

    const { data: allProgress } = await db.from('user_progress').select('*').limit(500);
    const progressByUser: Record<string, any> = {};
    for (const p of allProgress || []) progressByUser[p.created_by_id] = p;

    let sent = 0, skipped = 0;
    for (const profile of profiles || []) {
      if (profile.agent_proactive_enabled === false) { skipped++; continue; }
      if (profile.notification_prefs?.agente_proativo === false) { skipped++; continue; }

      const sentToday = await countProactiveToday(db, profile.id);
      if (sentToday >= 3) { skipped++; continue; }

      // 1) Oração do Caminho não concluída após as 12h UTC (~09h BRT)
      if (profile.status === 'preparacao' && hourUTC >= 12) {
        const progress = progressByUser[profile.id];
        if (progress && progress.status === 'ativa' && progress.current_day <= 33
            && !(progress.completed_days || []).includes(progress.current_day)) {
          // Verifica se já enviou um lembrete de oração hoje (título específico)
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const { count: prayerReminder } = await db.from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id).eq('category', 'agente_proativo')
            .eq('title', 'Não esqueça sua oração de hoje')
            .gte('created_date', todayStart.toISOString());
          if (!prayerReminder) {
            const context = `O usuário está no Dia ${progress.current_day} de 33 da preparação e ainda não concluiu a oração de hoje. Já passou do meio-dia. Um lembrete gentil e encorajador é oportuno.`;
            const result = await sendProactiveAgentMessage(db, profile.id, context,
              'Não esqueça sua oração de hoje',
              `Você ainda não concluiu o Dia ${progress.current_day} da sua preparação. Reserve um momento para rezar.`,
              '/caminho');
            if (result.ok) sent++; else skipped++;
            continue;
          }
        }
      }

      // 2) Jornada ativa com progresso < 100% — lembrete uma vez ao dia (após 14h UTC)
      if (hourUTC >= 14) {
        const { data: participations } = await db.from('journey_participants')
          .select('journey_id,progress').eq('created_by_id', profile.id);
        if (participations?.length) {
          const journeyIds = participations.map((p: any) => p.journey_id);
          const { data: journeys } = await db.from('collective_journeys')
            .select('id,title,status,end_date').in('id', journeyIds).eq('status', 'ativa');
          const nowDate = new Date();
          const active = (journeys || []).filter((j: any) =>
            !j.end_date || new Date(j.end_date) >= nowDate
          );
          if (active.length) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const { count: journeyReminder } = await db.from('notifications')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', profile.id).eq('category', 'agente_proativo')
              .eq('title', 'Suas jornadas aguardam')
              .gte('created_date', todayStart.toISOString());
            if (!journeyReminder) {
              const journeyNames = active.map((j: any) => j.title).join(', ');
              const context = `O usuário participa de jornadas ativas (${journeyNames}) e o progresso ainda não está completo. Um lembrete gentil para continuar a caminhada é oportuno.`;
              const result = await sendProactiveAgentMessage(db, profile.id, context,
                'Suas jornadas aguardam',
                `Você participa de ${active.length} jornada(s) ativa(s). Continue sua caminhada hoje.`,
                '/jornadas');
              if (result.ok) sent++; else skipped++;
              continue;
            }
          }
        }
      }
    }

    return json({ ok: true, sent, skipped });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});