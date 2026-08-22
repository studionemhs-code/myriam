// Datas de indulgências da Associação Maria Rainha dos Corações.
// Inclui cálculo da Quinta-feira Santa (Páscoa - 3 dias) via Computus gregoriano.

const computeEaster = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

export const getIndulgenceDays = (year = new Date().getFullYear(), userInscriptionDate = null) => {
  const days = [
    { label: 'Anunciação do Senhor', date: new Date(year, 2, 25), fixed: true },
    { label: 'São Luís Maria Grignion de Montfort', date: new Date(year, 3, 28), fixed: true },
    { label: 'Imaculada Conceição', date: new Date(year, 11, 8), fixed: true },
    { label: 'Natal do Senhor', date: new Date(year, 11, 25), fixed: true },
  ];
  const easter = computeEaster(year);
  const holyThursday = new Date(easter);
  holyThursday.setDate(easter.getDate() - 3);
  days.push({ label: 'Quinta-feira Santa', date: holyThursday, fixed: false });
  if (userInscriptionDate) {
    const insc = typeof userInscriptionDate === 'string' && userInscriptionDate.length === 10
      ? new Date(userInscriptionDate + 'T00:00:00')
      : new Date(userInscriptionDate);
    if (!isNaN(insc.getTime())) {
      const anniversary = new Date(year, insc.getMonth(), insc.getDate());
      days.push({ label: 'Aniversário de Ingresso na Associação', date: anniversary, fixed: false, userSpecific: true });
    }
  }
  return days.sort((a, b) => a.date - b.date);
};

export const isIndulgenceDay = (userInscriptionDate = null, date = new Date()) => {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = getIndulgenceDays(date.getFullYear(), userInscriptionDate);
  return days.find((d) => {
    const dd = new Date(d.date.getFullYear(), d.date.getMonth(), d.date.getDate());
    return dd.getTime() === today.getTime();
  }) || null;
};

export const getNextIndulgenceDay = (userInscriptionDate = null, date = new Date()) => {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let year = date.getFullYear();
  let days = getIndulgenceDays(year, userInscriptionDate).filter((d) => {
    const dd = new Date(d.date.getFullYear(), d.date.getMonth(), d.date.getDate());
    return dd >= today;
  });
  if (days.length === 0) {
    year++;
    days = getIndulgenceDays(year, userInscriptionDate);
  }
  return days[0] || null;
};