import { parseDate, daysBetween } from '@/lib/marianDates';

export const TOTAL_DAYS = 33;

/**
 * Calcula o dia atual desbloqueado com base no tempo decorrido desde started_date.
 * Lógica compartilhada entre Hoje, Caminho e DayDetail para garantir sincronia.
 * @param {string|null} startedDateISO - data de início da preparação (ISO date)
 * @returns {number} dia atual desbloqueado (1-33)
 */
export function getCurrentUnlockedDay(startedDateISO) {
  if (!startedDateISO) return 1;
  const startedDate = parseDate(startedDateISO);
  const now = new Date();
  const elapsed = daysBetween(startedDate, now);
  return Math.min(TOTAL_DAYS, Math.max(1, elapsed + 1));
}

/**
 * Calcula os dias restantes para a consagração.
 * @param {object} user - objeto do usuário (com target_consecration_date)
 * @param {number} currentUnlocked - dia atual desbloqueado
 * @returns {number} dias restantes
 */
export function getDaysLeft(user, currentUnlocked) {
  if (user?.target_consecration_date) {
    const target = parseDate(user.target_consecration_date);
    const now = new Date();
    return Math.max(0, daysBetween(now, target));
  }
  return Math.max(0, TOTAL_DAYS - currentUnlocked + 1);
}

/**
 * Calcula o percentual de conclusão.
 * @param {number[]} completedDays - array com os dias concluídos
 * @returns {number} percentual (0-100)
 */
export function getProgressPercent(completedDays = []) {
  return Math.round((completedDays.length / TOTAL_DAYS) * 100);
}

/**
 * Sincroniza o current_day no banco se estiver divergente do cálculo temporal.
 * @param {object} progress - registro de UserProgress
 * @param {number} currentUnlocked - dia calculado
 * @param {function} updateFn - função de update (base44.entities.UserProgress.update)
 * @returns {Promise<object>} progress atualizado (ou o mesmo se não houve mudança)
 */
export async function syncCurrentDay(progress, currentUnlocked, updateFn) {
  if (!progress || !progress.started_date) return progress;
  if (progress.current_day !== currentUnlocked) {
    try {
      return await updateFn(progress.id, { current_day: currentUnlocked });
    } catch {
      return progress;
    }
  }
  return progress;
}

/**
 * Verifica se um dia está desbloqueado para acesso.
 * Condições: a meia-noite do dia chegou (dayNum <= getCurrentUnlockedDay)
 * E todos os dias anteriores (1..dayNum-1) foram concluídos.
 * @param {number} dayNum - número do dia (1-33)
 * @param {object} progress - registro de UserProgress (com completed_days)
 * @param {string|null} startedDateISO - data de início da preparação
 * @returns {boolean}
 */
export function isDayUnlocked(dayNum, progress, startedDateISO) {
  if (!startedDateISO) return dayNum === 1;
  const timeUnlocked = dayNum <= getCurrentUnlockedDay(startedDateISO);
  if (!timeUnlocked) return false;
  const completedDays = progress?.completed_days || [];
  for (let d = 1; d < dayNum; d++) {
    if (!completedDays.includes(d)) return false;
  }
  return true;
}