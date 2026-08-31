// Utilitários de data mariana — Consagração, renovação anual e calendário.

export function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysBetween(from, to) {
  const a = startOfDay(from);
  const b = startOfDay(to);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function daysSince(date) {
  const d = parseDate(date);
  if (!d) return 0;
  return Math.max(0, daysBetween(d, new Date()));
}

export function daysUntil(date) {
  const d = parseDate(date);
  if (!d) return 0;
  return Math.max(0, daysBetween(new Date(), d));
}

export function addYears(date, years) {
  const d = parseDate(date);
  if (!d) return null;
  const n = new Date(d);
  n.setFullYear(n.getFullYear() + years);
  return n;
}

export function nextRenewal(consecrationDate, lastRenewalDate) {
  const base = parseDate(lastRenewalDate) || parseDate(consecrationDate);
  if (!base) return null;
  return addYears(base, 1);
}

export function formatDate(date, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const d = parseDate(date);
  if (!d) return '';
  return d.toLocaleDateString('pt-BR', opts);
}

export function formatShortDate(date) {
  return formatDate(date, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDuration(fromDate) {
  const from = parseDate(fromDate);
  if (!from) return '';
  const now = new Date();
  let years = now.getFullYear() - from.getFullYear();
  let months = now.getMonth() - from.getMonth();
  let days = now.getDate() - from.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  return parts.length ? parts.join(', ').replace(/, ([^,]*)$/, ' e $1') : 'hoje';
}

export function isToday(date) {
  const d = parseDate(date);
  if (!d) return false;
  return startOfDay(d).getTime() === startOfDay(new Date()).getTime();
}

export const MARIAN_FIXED_DATES = [
  { month: 0, day: 1, title: 'Maria, Mãe de Deus', type: 'solenidade' },
  { month: 1, day: 2, title: 'Apresentação do Senhor / Purificação de Maria', type: 'festa' },
  { month: 1, day: 11, title: 'Nossa Senhora de Lourdes', type: 'memoria' },
  { month: 2, day: 25, title: 'Anunciação do Senhor', type: 'solenidade' },
  { month: 4, day: 13, title: 'Nossa Senhora de Fátima', type: 'memoria' },
  { month: 4, day: 24, title: 'Maria, Auxílio dos Cristãos', type: 'memoria' },
  { month: 4, day: 31, title: 'Visitação de Nossa Senhora', type: 'festa' },
  { month: 6, day: 16, title: 'Nossa Senhora do Carmo', type: 'memoria' },
  { month: 7, day: 15, title: 'Assunção de Nossa Senhora', type: 'solenidade', featured: true },
  { month: 7, day: 22, title: 'Maria Rainha', type: 'memoria' },
  { month: 8, day: 8, title: 'Natividade de Nossa Senhora', type: 'festa' },
  { month: 8, day: 12, title: 'Santo Nome de Maria', type: 'memoria' },
  { month: 8, day: 15, title: 'Nossa Senhora das Dores', type: 'memoria' },
  { month: 9, day: 7, title: 'Nossa Senhora do Rosário', type: 'memoria' },
  { month: 9, day: 12, title: 'Nossa Senhora Aparecida', type: 'solenidade', featured: true },
  { month: 11, day: 8, title: 'Imaculada Conceição', type: 'solenidade', featured: true },
  { month: 11, day: 12, title: 'Nossa Senhora de Guadalupe', type: 'festa' }
];

export function getNextMarianEvent(from = new Date()) {
  const year = from.getFullYear();
  const sorted = MARIAN_FIXED_DATES
    .map((d) => ({ ...d, date: new Date(year, d.month, d.day) }))
    .sort((a, b) => a.date - b.date);
  const upcoming = sorted.find((d) => d.date >= startOfDay(from));
  if (upcoming) return upcoming;
  const next = { ...sorted[0], date: new Date(year + 1, sorted[0].month, sorted[0].day) };
  return next;
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export const WEEKDAYS_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];