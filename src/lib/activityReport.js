import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabase/client';

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Usuários ativos por dia nos últimos N dias (a partir de daily_activity).
export async function loadDailyActiveUsers(days = 30) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const rows = await base44.entities.DailyActivity.filter({ day: { $gte: dayKey(start) } }, 'day', 5000);
  const counts = {};
  rows.forEach((r) => { counts[r.day] = (counts[r.day] || 0) + 1; });
  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = dayKey(d);
    series.push({ key, label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, ativos: counts[key] || 0 });
  }
  const today = series[series.length - 1]?.ativos || 0;
  const avg = series.length ? Math.round(series.reduce((s, x) => s + x.ativos, 0) / series.length) : 0;
  const uniqueMonth = new Set(rows.filter((r) => r.day >= dayKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1))).map((r) => r.created_by_id)).size;
  return { series, today, avg, uniqueMonth };
}

// Conteúdos da formação mariana com mais interações no mês atual.
export async function loadTopContentThisMonth(limit = 10) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  // Contagens agregadas via função do banco (não expõe anotações/reflexões privadas).
  const [{ data: rows, error }, contents, courses, days] = await Promise.all([
    supabase.rpc('content_interactions_since', { since: monthStart }),
    base44.entities.ACAMFContent.list('-created_date', 500),
    base44.entities.Course.list('-created_date', 200),
    base44.entities.PreparationDay.list('day_number', 100)
  ]);
  if (error) throw new Error(error.message);

  const contentMap = Object.fromEntries(contents.map((c) => [c.id, c.title]));
  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.title]));
  const dayMap = Object.fromEntries(days.map((d) => [String(d.day_number), d.title]));

  return (rows || [])
    .map((r) => {
      const it = { key: `${r.ref_type}:${r.ref_id}`, type: r.ref_type, comentarios: Number(r.comentarios), anotacoes: Number(r.anotacoes), aulas: Number(r.aulas), reflexoes: Number(r.reflexoes) };
      const title = it.type === 'acamf' ? contentMap[r.ref_id] : it.type === 'curso' ? courseMap[r.ref_id] : dayMap[r.ref_id];
      return { ...it, title: it.type === 'dia' ? `Dia ${r.ref_id}${title ? ` · ${title}` : ''}` : title || 'Conteúdo removido', total: it.comentarios + it.anotacoes + it.aulas + it.reflexoes };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}