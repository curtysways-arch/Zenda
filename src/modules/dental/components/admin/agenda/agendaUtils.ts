export type AgendaAppt = {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  comentarios: string | null;
  total: number;
  pagoEstado: string;
  staffId: string | null;
  clienteId: string;
  checkedInAt: string | null;
  tieneEvolucion: boolean;
  cliente: { id: string; nombre: string; telefono: string } | null;
  service: { id: string; nombre: string; duracion: number } | null;
  staff: { id: string; name: string } | null;
};

export type AgendaBlock = { id: string; fecha: string; horaInicio: string; horaFin: string; motivo: string | null; staffId: string | null };

export const INACTIVE = ['cancelled', 'cancelada', 'CANCELADA', 'rejected', 'RECHAZADA', 'expired', 'EXPIRADA', 'no_show'];
export const DONE = ['completed', 'finalizada', 'COMPLETADA'];

export function toMin(hhmm: string) {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function toHM(min: number) {
  const m = Math.max(0, Math.min(min, 24 * 60 - 1));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function addDays(key: string, n: number) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Lunes de la semana de la fecha dada. */
export function weekStart(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 domingo
  return addDays(key, dow === 0 ? -6 : 1 - dow);
}

export function dayLabel(key: string, opts: Intl.DateTimeFormatOptions) {
  const [y, m, d] = key.split('-').map(Number);
  const txt = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-EC', { timeZone: 'UTC', ...opts });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/**
 * Reparte en carriles las citas que se cruzan dentro de una misma columna,
 * para dibujarlas lado a lado sin taparse.
 */
export function layoutLanes<T extends { horaInicio: string; horaFin: string }>(items: T[]) {
  const sorted = [...items].sort((a, b) => toMin(a.horaInicio) - toMin(b.horaInicio) || toMin(b.horaFin) - toMin(a.horaFin));
  const out: { item: T; lane: number; lanes: number }[] = [];
  let group: { item: T; lane: number }[] = [];
  let groupEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...group.map((g) => g.lane + 1));
    group.forEach((g) => out.push({ ...g, lanes }));
    group = [];
  };
  for (const item of sorted) {
    const s = toMin(item.horaInicio);
    const e = Math.max(toMin(item.horaFin), s + 10);
    if (group.length && s >= groupEnd) { flush(); groupEnd = -1; }
    const laneEnds: number[] = [];
    group.forEach((g) => { laneEnds[g.lane] = Math.max(laneEnds[g.lane] ?? -1, Math.max(toMin(g.item.horaFin), toMin(g.item.horaInicio) + 10)); });
    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] > s) lane++;
    group.push({ item, lane });
    groupEnd = Math.max(groupEnd, e);
  }
  if (group.length) flush();
  return out;
}

/** Colores de cada estado en la agenda (fondo, borde izquierdo, texto). */
export function stateStyle(estado: string) {
  if (DONE.includes(estado)) return 'bg-emerald-50 border-emerald-500 text-emerald-900';
  if (['in_progress', 'client_checked_in'].includes(estado)) return 'bg-violet-50 border-violet-500 text-violet-900';
  if (['pending', 'PENDIENTE', 'pendiente'].includes(estado)) return 'bg-amber-50 border-amber-500 text-amber-900';
  if (INACTIVE.includes(estado)) return 'bg-slate-50 border-slate-300 text-slate-400 line-through';
  return 'bg-sky-50 border-sky-500 text-sky-900';
}

/** Solo el color del borde (para tarjetas blancas en la vista de celular). */
export function stateBorder(estado: string) {
  if (DONE.includes(estado)) return 'border-emerald-500';
  if (['in_progress', 'client_checked_in'].includes(estado)) return 'border-violet-500';
  if (['pending', 'PENDIENTE', 'pendiente'].includes(estado)) return 'border-amber-500';
  if (INACTIVE.includes(estado)) return 'border-slate-300 opacity-60';
  return 'border-sky-500';
}
