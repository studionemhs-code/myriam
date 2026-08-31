// Regras de integridade da Consagração:
// - A PRIMEIRA data de consagração é imutável (só pode ser corrigida uma única vez,
//   dentro de uma janela curta após o registro).
// - Qualquer data posterior é sempre registrada como RENOVAÇÃO.
// - Invariante: renewals[0] === consecration_date.

export const EDIT_WINDOW_DAYS = 7;

export const isConsecrated = (user) => !!user?.consecration_date;

export const today = () => new Date().toISOString().slice(0, 10);

/** O usuário pode corrigir a data uma única vez, até 7 dias após o registro. */
export function canEditConsecrationDate(user) {
  if (!isConsecrated(user)) return false;
  if (user.consecration_date_edited) return false;
  const base = new Date(String(user.consecration_date).slice(0, 10) + 'T00:00:00');
  const days = (Date.now() - base.getTime()) / 86400000;
  return days >= 0 && days <= EDIT_WINDOW_DAYS;
}

/** Primeiro registro: define a data original e semeia o histórico. */
export function buildFirstConsecrationPayload(date) {
  return {
    status: 'consagrado',
    consecration_date: date,
    last_renewal_date: date,
    renewals: [date]
  };
}

/** Renovação: nunca toca em consecration_date; deduplica o histórico. */
export function buildRenewalPayload(user, date) {
  const renewals = user?.renewals || [];
  const next = renewals.includes(date) ? renewals : [...renewals, date].sort();
  return {
    status: 'consagrado',
    last_renewal_date: date,
    renewals: next
  };
}

/** Correção única da data original (mantém a invariante renewals[0]). */
export function buildCorrectionPayload(user, date) {
  const renewals = [...(user?.renewals || [])];
  if (renewals.length === 0) renewals.push(date);
  else renewals[0] = date;
  return {
    consecration_date: date,
    last_renewal_date: user?.last_renewal_date && user.last_renewal_date !== user.consecration_date
      ? user.last_renewal_date
      : date,
    renewals,
    consecration_date_edited: true
  };
}

/** Ponto único de gravação: primeira consagração ou renovação. */
export function registerConsecrationOrRenewal(user, date) {
  return isConsecrated(user)
    ? buildRenewalPayload(user, date)
    : buildFirstConsecrationPayload(date);
}