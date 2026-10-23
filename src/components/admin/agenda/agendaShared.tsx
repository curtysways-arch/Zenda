'use client';
/**
 * Piezas compartidas de la agenda (celular): estados, siguiente paso de cada cita,
 * fechas, dinero y la hoja inferior (bottom sheet) que usan las ventanas de gestión.
 */
import { useEffect } from 'react';
import { X } from 'lucide-react';

export type Cita = any;

/** Estados que maneja la agenda, con su color (no se usa "emerald": en esta app está teñido con el color de la marca). */
export const ESTADOS: Record<string, { label: string; dot: string; pill: string; bar: string }> = {
  pending: { label: 'Por confirmar', dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-800 ring-amber-200', bar: '#f59e0b' },
  confirmed: { label: 'Confirmada', dot: 'bg-sky-500', pill: 'bg-sky-50 text-sky-800 ring-sky-200', bar: '#0ea5e9' },
  approved: { label: 'Confirmada', dot: 'bg-sky-500', pill: 'bg-sky-50 text-sky-800 ring-sky-200', bar: '#0ea5e9' },
  client_checked_in: { label: 'Llegó', dot: 'bg-violet-500', pill: 'bg-violet-50 text-violet-800 ring-violet-200', bar: '#8b5cf6' },
  in_progress: { label: 'En atención', dot: 'bg-violet-600', pill: 'bg-violet-100 text-violet-900 ring-violet-300', bar: '#7c3aed' },
  completed: { label: 'Finalizada', dot: 'bg-green-600', pill: 'bg-green-50 text-green-800 ring-green-200', bar: '#16a34a' },
  cancelled: { label: 'Cancelada', dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 ring-slate-200', bar: '#94a3b8' },
  no_show: { label: 'No vino', dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700 ring-rose-200', bar: '#f43f5e' },
  expired: { label: 'Vencida', dot: 'bg-slate-300', pill: 'bg-slate-100 text-slate-500 ring-slate-200', bar: '#cbd5e1' },
};
export const estadoOf = (e?: string) => ESTADOS[String(e || 'pending').toLowerCase()] || ESTADOS.pending;

export const ABIERTOS = ['pending', 'confirmed', 'approved', 'client_checked_in', 'in_progress'];
export const isOpen = (c: Cita) => ABIERTOS.includes(String(c.estado || '').toLowerCase());
export const isClosed = (c: Cita) => !isOpen(c);

/** Siguiente paso de una cita (lo que el local hace después). */
export type Paso = { estado: string; label: string; finalizar?: boolean } | null;
export function siguientePaso(c: Cita): Paso {
  switch (String(c.estado || '').toLowerCase()) {
    case 'pending': return { estado: 'confirmed', label: 'Confirmar' };
    case 'confirmed':
    case 'approved': return { estado: 'in_progress', label: 'Llegó' };
    case 'client_checked_in': return { estado: 'in_progress', label: 'Atender' };
    case 'in_progress': return { estado: 'completed', label: 'Finalizar y cobrar', finalizar: true };
    default: return null;
  }
}

/** La fecha de la cita se guarda a medianoche UTC: se lee en UTC para no correr el día. */
export function dateKey(fecha: any): string {
  if (!fecha) return '';
  const d = new Date(fecha);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
export function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function keyToDate(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export const toMin = (t?: string) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
export const toHora = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export function hora12(t?: string) {
  if (!t) return '';
  const m = toMin(t);
  const h = Math.floor(m / 60);
  return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** ¿Ya pasó la hora de fin y sigue abierta? (se quedó sin cerrar) */
export function sinCerrar(c: Cita): boolean {
  if (!isOpen(c)) return false;
  const k = dateKey(c.fecha);
  if (!k) return false;
  const end = keyToDate(k);
  const fin = toMin(c.horaFin || c.horaInicio || '23:59');
  end.setHours(Math.floor(fin / 60), fin % 60, 0, 0);
  return end.getTime() < Date.now();
}

export const money = (n: any) => `$${(Number(n) || 0).toFixed(Number(n) % 1 ? 2 : 0)}`;

export function pagosDe(c: Cita): any[] {
  return (Array.isArray(c.pagos) ? c.pagos : Array.isArray(c.pagoReserva) ? c.pagoReserva : []) as any[];
}
export function pagado(c: Cita): number {
  return pagosDe(c).reduce((s, p) => s + (Number(p.monto) || 0), 0);
}
export function saldo(c: Cita): number {
  return Math.max(0, (Number(c.total) || 0) - pagado(c));
}

export const nombreCliente = (c: Cita) => c.cliente?.nombre || c.Usuario?.nombre || 'Cliente';
export const telefonoCliente = (c: Cita) => String(c.cliente?.telefono || c.Usuario?.telefono || c.Usuario?.phone || '');
export const nombreServicio = (c: Cita) => c.service?.nombre || c.nombreServicio || 'Servicio';

export function waLink(phone?: string | null, text?: string) {
  let n = String(phone || '').replace(/\D/g, '');
  if (n.startsWith('0') && n.length === 10) n = `593${n.slice(1)}`;
  if (n.length === 9) n = `593${n}`;
  return n.length >= 10 ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null;
}

/** Color de texto legible sobre el color de la marca. */
export function inkOn(color: string) {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color || '')) return '#ffffff';
  const h = color.slice(1);
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#1e1b2e' : '#ffffff';
}

/** Hoja que sube desde abajo, por encima de la barra de navegación del celular. */
export function Sheet({ title, subtitle, onClose, children, footer }: {
  title: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] animate-in fade-in duration-200" />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl animate-in slide-in-from-bottom-8 duration-300 sm:max-w-lg sm:rounded-[28px]">
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" aria-hidden />
        <div className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-3">
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold leading-tight text-slate-900">{title}</div>
            {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} className="-mr-1 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-slate-100 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>}
      </div>
    </div>
  );
}

export const field = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100';
