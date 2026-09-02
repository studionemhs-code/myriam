import { json, preflight, currentUser, admin, notifyUser } from '../_shared/utils.ts';

const computeEaster = (year: number) => {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const getIndulgenceDays = (year: number, inscriptionDate: string | null) => {
  const days = [
    { label: 'Anunciação do Senhor', date: new Date(year, 2, 25) },
    { label: 'São Luís Maria Grignion de Montfort', date: new Date(year, 3, 28) },
    { label: 'Imaculada Conceição', date: new Date(year, 11, 8) },
    { label: 'Natal do Senhor', date: new Date(year, 11, 25) }
  ];
  const easter = computeEaster(year);
  const holyThursday = new Date(easter);
  holyThursday.setDate(easter.getDate() - 3);
  days.push({ label: 'Quinta-feira Santa', date: holyThursday });
  if (inscriptionDate) {
    const insc = new Date(inscriptionDate + 'T00:00:00');
    if (!isNaN(insc.getTime())) {
      days.push({ label: 'Aniversário de Ingresso na Associação', date: new Date(year, insc.getMonth(), insc.getDate()) });
    }
  }
  return days;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const isCron = (req.headers.get('Authorization') || '').includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (!isCron) {
      const user = await currentUser(req);
      if (!user || user.role !== 'admin') return json({ error: 'Forbidden' }, 403);
    }

    const db = admin();
    const { data: profiles } = await db.from('profiles').select('*').limit(500);
    const { data: allProgress } = await db.from('user_progress').select('*').limit(500);
    const progressByUser: Record<string, any> = {};
    for (const p of allProgress || []) progressByUser[p.created_by_id] = p;

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const year = today.getFullYear();
    let created = 0;

    // Indulgências da Associação
    const { data: approvedReqs } = await db.from('association_requests').select('*').eq('status', 'aprovado');
    for (const ar of approvedReqs || []) {
      if (!ar.approved_date || !ar.user_id) continue;
      const matching = getIndulgenceDays(year, ar.approved_date).find((d) => isSameDay(d.date, todayMidnight));
      if (matching) {
        await notifyUser(ar.user_id, 'associacao', `Dia de Indulgência — ${matching.label}`,
          `Hoje é ${matching.label}. Como membro da Associação Maria Rainha dos Corações, você pode lucrar a indulgência plenária.`, '/associacao');
        created++;
      }
    }

    for (const p of profiles || []) {
      const uid = p.id;

      if (p.consecration_date) {
        const cDate = new Date(p.consecration_date + 'T00:00:00');
        const thisYear = new Date(today.getFullYear(), cDate.getMonth(), cDate.getDate());
        if (Math.round((thisYear.getTime() - todayMidnight.getTime()) / 86400000) === 0) {
          await notifyUser(uid, 'renovacao', 'Dia da sua Consagração',
            'Hoje celebramos o dia da sua Total Consagração. Glória a Deus!', '/minha-consagracao');
          created++;
        }
      }

      if (p.status === 'consagrado' && p.consecration_date) {
        const base = new Date((p.last_renewal_date || p.consecration_date) + 'T00:00:00');
        const renewal = new Date(base);
        renewal.setFullYear(today.getFullYear());
        if (renewal < todayMidnight) renewal.setFullYear(today.getFullYear() + 1);
        const diff = Math.round((renewal.getTime() - todayMidnight.getTime()) / 86400000);
        if (diff === 7) {
          await notifyUser(uid, 'renovacao', 'Sua renovação se aproxima',
            'Faltam 7 dias para a sua renovação anual da Consagração.', '/minha-consagracao');
          created++;
        } else if (diff === 0) {
          await notifyUser(uid, 'renovacao', 'Hoje é o dia da sua renovação',
            'Hoje é o dia de renovar sua Total Consagração a Jesus por Maria.', '/minha-consagracao');
          created++;
        }
      }

      if (p.status === 'preparacao' && p.target_consecration_date) {
        const target = new Date(p.target_consecration_date + 'T00:00:00');
        const diff = Math.round((target.getTime() - todayMidnight.getTime()) / 86400000);
        if (diff === 7) {
          await notifyUser(uid, 'caminho', 'Sua consagração se aproxima',
            'Faltam 7 dias para a data prevista da sua Consagração.', '/caminho');
          created++;
        } else if (diff === 0) {
          await notifyUser(uid, 'caminho', 'Hoje é o dia da sua Consagração',
            'Que Maria te conduza hoje ao ato de Consagração.', '/consagracao');
          created++;
        }
      }

      if (p.status === 'preparacao') {
        const progress = progressByUser[uid];
        if (progress && progress.status === 'ativa' && progress.current_day <= 33
            && !(progress.completed_days || []).includes(progress.current_day)) {
          await notifyUser(uid, 'caminho', 'Não esqueça sua oração de hoje',
            `Você ainda não concluiu o Dia ${progress.current_day} da sua preparação. Reserve um momento para rezar.`, '/caminho');
          created++;
        }
      }
    }

    return json({ ok: true, created });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});