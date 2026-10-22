/**
 * Ciclo de vida de la suscripción de un negocio — UNA sola regla para todo Citiox.
 *
 *   Registro ──► PRUEBA (30 días, todo incluido)
 *                 │  avisos: día 23, 28 y 30
 *                 ▼
 *   Vence sin pagar ──► GRACIA (7 días: todo funciona + aviso fijo "Activa tu plan")
 *                 ▼
 *   Sigue sin pagar ──► BLOQUEADO: el panel solo muestra "Mi plan" y la página pública
 *                       deja de aceptar reservas/pedidos ("Temporalmente no disponible").
 *                       No se borra nada.
 *   Paga ──► ACTIVO de inmediato (se reactiva todo).
 *
 * Se calcula SIEMPRE a partir de las fechas (fechaFin), no de procesos programados, así
 * que no depende de que un cron haya corrido.
 */

export const TRIAL_DAYS = 30;
export const GRACE_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

export type SubscriptionPhase = 'TRIAL' | 'ACTIVE' | 'GRACE' | 'BLOCKED' | 'SUSPENDED' | 'NONE';

export type PhaseInfo = {
  phase: SubscriptionPhase;
  /** Fin de la prueba o del período pagado. */
  endsAt: Date | null;
  /** Último día de gracia (endsAt + 7 días). */
  graceEndsAt: Date | null;
  /** Días que faltan para endsAt (negativo si ya pasó). */
  daysLeft: number | null;
  /** Días de gracia que quedan (solo en GRACE). */
  graceDaysLeft: number | null;
  /** La suscripción está (o estaba) en período de prueba. */
  isTrial: boolean;
  /** Plan gratuito o precio $0 asignado por Citiox: nunca se bloquea por fecha. */
  isFree: boolean;
};

export type PhaseInput = {
  estado?: string | null;
  fechaFin?: Date | string | null;
  planIsFree?: boolean | null;
  planPrice?: number | null;
  /** Estado del negocio (SUSPENDIDO = suspendido manualmente por Citiox). */
  negocioEstado?: string | null;
};

export function computePhase(input: PhaseInput | null | undefined, now: Date = new Date()): PhaseInfo {
  const base: PhaseInfo = {
    phase: 'NONE',
    endsAt: null,
    graceEndsAt: null,
    daysLeft: null,
    graceDaysLeft: null,
    isTrial: false,
    isFree: false,
  };
  if (!input) return base;

  if (String(input.negocioEstado || '').toUpperCase() === 'SUSPENDIDO') {
    return { ...base, phase: 'SUSPENDED' };
  }

  const estado = String(input.estado || '').toLowerCase();
  const isTrial = estado.startsWith('trial');
  const isFree = Boolean(input.planIsFree);
  const endsAt = input.fechaFin ? new Date(input.fechaFin) : null;

  if (!endsAt || isNaN(endsAt.getTime())) {
    return { ...base, phase: isTrial ? 'TRIAL' : 'ACTIVE', isTrial, isFree };
  }

  const graceEndsAt = new Date(endsAt.getTime() + GRACE_DAYS * DAY);
  const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / DAY);
  const info = { ...base, endsAt, graceEndsAt, daysLeft, isTrial, isFree };

  if (isFree && !isTrial) return { ...info, phase: 'ACTIVE' };
  if (now <= endsAt) return { ...info, phase: isTrial ? 'TRIAL' : 'ACTIVE' };
  if (now <= graceEndsAt) {
    return { ...info, phase: 'GRACE', graceDaysLeft: Math.max(0, Math.ceil((graceEndsAt.getTime() - now.getTime()) / DAY)) };
  }
  return { ...info, phase: 'BLOCKED' };
}

/** ¿Puede recibir reservas y pedidos de clientes? */
export function canReceiveCustomers(info: PhaseInfo) {
  return info.phase !== 'BLOCKED' && info.phase !== 'SUSPENDED';
}

/** Fecha de inicio del siguiente período pagado: si aún le quedan días (prueba o plan), se suman. */
export function nextPeriodStart(currentEnd: Date | string | null | undefined, now: Date = new Date()) {
  const end = currentEnd ? new Date(currentEnd) : null;
  return end && end > now ? end : now;
}

export function addMonths(from: Date, months: number) {
  const d = new Date(from);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // 31 ene + 1 mes → 28/29 feb (no 3 mar)
  if (d.getDate() < day) d.setDate(0);
  return d;
}

export function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * DAY);
}
