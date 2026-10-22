/**
 * Canchas: horarios disponibles y precio de cada turno.
 * Lo usan la página pública (para mostrar horas libres) y el servidor (para validar y cobrar),
 * así el precio que ve el cliente es el mismo que se guarda.
 */

export type Busy = { inicio: string; fin: string; motivo?: string | null };

export type CourtPromo = {
  precioPromo?: number | null;
  precioAnterior?: number | null;
  estado?: string | null;
  fechaInicio?: string | Date | null;
  fechaFin?: string | Date | null;
  diasValidos?: string | null;
  horaInicioValida?: string | null;
  horaFinValida?: string | null;
  tipoPromo?: string | null;
};

export type AutoDiscount = {
  enabled?: boolean;
  discountPercentage?: number;
  daysOfWeek?: string | null;
  startTime?: string | null;
  endTime?: string | null;
} | null;

export const toMin = (t: string) => {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
export const fromMin = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

/** Día de la semana (0 = domingo) de una fecha YYYY-MM-DD, sin depender de la zona horaria. */
export function dayOfWeek(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const dateOnly = (v: any): string | null => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

/** Descuento (%) que aplica a un turno: promoción de la cancha o descuento automático por horario. */
export function slotDiscount(opts: {
  dateStr: string;
  time: string;
  basePrice: number;
  promos?: CourtPromo[];
  auto?: AutoDiscount;
}): { percent: number; label: string } {
  const { dateStr, time, basePrice, promos = [], auto } = opts;
  const hourNum = Number(time.replace(':', ''));
  const dow = dayOfWeek(dateStr);
  let best = { percent: 0, label: '' };

  for (const p of promos) {
    if (!p) continue;
    const estado = String(p.estado || '').toLowerCase();
    if (estado && !['activa', 'activo', 'publicada', 'publicado'].includes(estado)) continue;
    const ini = dateOnly(p.fechaInicio);
    const fin = dateOnly(p.fechaFin);
    if (ini && dateStr < ini) continue;
    if (fin && dateStr > fin) continue;
    if (p.diasValidos && String(p.diasValidos).trim()) {
      const days = String(p.diasValidos).split(',').map((x) => Number(x.trim()));
      if (!days.includes(dow)) continue;
    }
    if (p.horaInicioValida && p.horaFinValida) {
      const s = Number(String(p.horaInicioValida).replace(':', ''));
      const e = Number(String(p.horaFinValida).replace(':', ''));
      if (e >= s ? hourNum < s || hourNum > e : hourNum < s && hourNum > e) continue;
    }
    const anterior = Number(p.precioAnterior || basePrice || 0);
    const promo = Number(p.precioPromo || 0);
    const pct = anterior > 0 && promo > 0 ? Math.round(((anterior - promo) / anterior) * 100) : 0;
    if (pct > best.percent) best = { percent: Math.max(0, Math.min(90, pct)), label: `-${pct}%` };
  }
  if (best.percent > 0) return best;

  if (auto && auto.enabled && Number(auto.discountPercentage) > 0) {
    const days = String(auto.daysOfWeek || '');
    if (days.includes(String(dow)) && auto.startTime && auto.endTime) {
      const s = Number(auto.startTime.replace(':', ''));
      const e = Number(auto.endTime.replace(':', ''));
      if (hourNum >= s && hourNum <= e) {
        const pct = Math.round(Number(auto.discountPercentage));
        return { percent: Math.max(0, Math.min(90, pct)), label: `-${pct}%` };
      }
    }
  }
  return best;
}

/** Precio total de un turno (precio por hora × horas, con descuento). */
export function slotPrice(opts: { dateStr: string; time: string; pricePerHour: number; hours: number; promos?: CourtPromo[]; auto?: AutoDiscount }) {
  const base = Math.round(opts.pricePerHour * opts.hours * 100) / 100;
  const d = slotDiscount({ dateStr: opts.dateStr, time: opts.time, basePrice: opts.pricePerHour, promos: opts.promos, auto: opts.auto });
  const total = Math.round(base * (1 - d.percent / 100) * 100) / 100;
  return { base, total, percent: d.percent, label: d.label };
}

/**
 * Horas de inicio posibles para una cancha en un día.
 * @param nowMin minutos desde medianoche "ahora" si el día es hoy (para ocultar horas pasadas); null si no es hoy.
 */
export function buildSlots(opts: {
  open: string;
  close: string;
  durationMin: number;
  stepMin: number;
  busy: Busy[];
  nowMin: number | null;
}): { time: string; end: string; available: boolean }[] {
  const o = toMin(opts.open);
  let c = toMin(opts.close);
  if (isNaN(o) || isNaN(c)) return [];
  if (c <= o) c += 24 * 60; // cierra pasada la medianoche
  const busy = opts.busy
    .map((b) => ({ s: toMin(b.inicio), e: toMin(b.fin) }))
    .filter((b) => !isNaN(b.s) && !isNaN(b.e))
    .map((b) => ({ s: b.s, e: b.e <= b.s ? b.e + 24 * 60 : b.e }));
  const out: { time: string; end: string; available: boolean }[] = [];
  for (let t = o; t + opts.durationMin <= c; t += opts.stepMin) {
    const end = t + opts.durationMin;
    const past = opts.nowMin !== null && t < opts.nowMin + 10; // margen de 10 min
    const clash = busy.some((b) => t < b.e && end > b.s);
    out.push({ time: fromMin(t), end: fromMin(end), available: !past && !clash });
  }
  return out;
}

/** ¿El intervalo [inicio, fin) choca con alguno ocupado? */
export function overlaps(inicio: string, fin: string, busy: Busy[]) {
  const s = toMin(inicio);
  let e = toMin(fin);
  if (e <= s) e += 24 * 60;
  return busy.some((b) => {
    const bs = toMin(b.inicio);
    let be = toMin(b.fin);
    if (be <= bs) be += 24 * 60;
    return s < be && e > bs;
  });
}

export const ACTIVE_BOOKING_STATES_EXCLUDED = ['rejected', 'RECHAZADA', 'cancelled', 'CANCELADA', 'expired', 'EXPIRADA', 'no_show'];
