/**
 * Flujo de una orden de lavandería, compartido por "Hoy" (inicio) y "Órdenes".
 *
 *  Por confirmar → Retiro → Revisar → En proceso → Listas → Entrega → Cerradas
 *
 * `nextStep` dice en qué está cada orden y cuál es la siguiente acción del local.
 * Los estados y los endpoints son los mismos de siempre (api/shoe-care/orders/...).
 */
import {
  Inbox, Truck, Receipt, Sparkles, CheckCircle2, PackageCheck, Archive,
} from 'lucide-react';
import type { LaundryWords } from '@/lib/laundry/wording';

export type Order = any;

export const money = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;

export const parseExtra = (raw: any) => {
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  return raw;
};

export type StageKey = 'confirmar' | 'retiro' | 'revisar' | 'proceso' | 'listas' | 'entrega' | 'cerradas';

export const STAGES: { key: StageKey; label: string; hint: string; Icon: any; states: string[]; local: boolean }[] = [
  {
    key: 'confirmar', label: 'Por confirmar', Icon: Inbox, local: true,
    hint: 'Solicitudes nuevas. Al confirmarlas, el cliente recibe su código y la orden pasa a los repartidores.',
    states: ['SOLICITADA', 'PENDIENTE_RETIRO'],
  },
  {
    key: 'retiro', label: 'Retiro en curso', Icon: Truck, local: false,
    hint: 'Un repartidor va por los artículos. El cliente confirma la entrega con el código del repartidor.',
    states: ['ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO'],
  },
  {
    key: 'revisar', label: 'Por revisar', Icon: Receipt, local: true,
    hint: 'Revisa los artículos y fija el precio final. Si sube del estimado, el cliente lo aprueba antes de empezar.',
    states: ['RECIBIDO', 'RETIRADO', 'INSPECCIONADO', 'CAMBIOS_SOLICITADOS', 'ACEPTADO', 'PRODUCTOS_CONFIRMADOS', 'CAMBIOS_ACEPTADOS'],
  },
  {
    key: 'proceso', label: 'En proceso', Icon: Sparkles, local: true,
    hint: 'Avanza cada orden por sus etapas. Al terminar, márcala como lista.',
    states: ['EN_PROCESO', 'EN_LAVADO', 'EN_SECADO', 'EN_ACABADOS', 'LAVANDO', 'SECANDO', 'DETALLADO'],
  },
  {
    key: 'listas', label: 'Listas', Icon: CheckCircle2, local: true,
    hint: 'A domicilio: pide un repartidor. En el local: cobra y entrega cuando el cliente venga.',
    states: ['LISTO', 'LISTO_PARA_ENTREGA'],
  },
  {
    key: 'entrega', label: 'Entrega en curso', Icon: PackageCheck, local: false,
    hint: 'Cuando llegue el repartidor, pídele su código y entrégale la orden. Él cierra la entrega con el código del cliente.',
    states: ['ESPERANDO_REPARTIDOR_ENTREGA', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR', 'EN_RUTA_ENTREGA', 'ESPERANDO_CLIENTE'],
  },
  {
    key: 'cerradas', label: 'Cerradas', Icon: Archive, local: false,
    hint: 'Órdenes entregadas o canceladas.',
    states: ['ENTREGADO', 'FINALIZADA', 'FINALIZADO', 'COMPLETADO', 'CANCELADO', 'CANCELADA'],
  },
];

export const stageOf = (estado: string): StageKey | null => STAGES.find((s) => s.states.includes(estado))?.key || null;
export const stageMeta = (k: StageKey) => STAGES.find((s) => s.key === k)!;

export const DEFAULT_PROCESS = [
  { estado: 'EN_LAVADO', label: 'Lavado' },
  { estado: 'EN_SECADO', label: 'Secado' },
  { estado: 'EN_ACABADOS', label: 'Planchado y acabados' },
];

export function processSteps(negocio: any): { estado: string; label: string }[] {
  const cfg = parseExtra(negocio?.configuracion);
  return Array.isArray(cfg.procesosLavanderia) && cfg.procesosLavanderia.length ? cfg.procesosLavanderia : DEFAULT_PROCESS;
}

export const isClosed = (o: Order) => stageOf(o.estado) === 'cerradas';
export const isCancelled = (o: Order) => ['CANCELADO', 'CANCELADA'].includes(o.estado);
export const isDelivered = (o: Order) => ['ENTREGADO', 'FINALIZADA', 'FINALIZADO', 'COMPLETADO'].includes(o.estado);

export function isToday(d?: string | Date | null) {
  if (!d) return false;
  const x = new Date(d);
  const n = new Date();
  return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth() && x.getDate() === n.getDate();
}

export function since(d?: string | Date | null) {
  if (!d) return '';
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  return days === 1 ? 'ayer' : `hace ${days} días`;
}

export function isPaid(o: Order) {
  const ex = parseExtra(o.extraInfo);
  return ex.pagoCliente === 'PAGADO' || ['CONFIRMADO', 'PAGO_VERIFICADO'].includes(String(o.payment?.estado || ''));
}

export const owesPayment = (o: Order) => !isPaid(o) && !isCancelled(o) && !['SOLICITADA', 'PENDIENTE_RETIRO'].includes(o.estado);

export function driverName(ex: any) {
  return ex.assignedDriverName || ex.assignedDriver || 'El repartidor';
}

export const isHome = (o: Order) => o.tipoEntrega === 'DOMICILIO';

/** Resumen corto de lo que trae la orden: "2× Zapatos: Limpieza profunda, 1× Gorra…" */
export function itemsSummary(o: Order) {
  const items: any[] = Array.isArray(o.items) ? o.items : [];
  if (items.length) return items.map((it) => `${Number(it.cantidad) || 1}× ${it.nombreProducto}`).join(' · ');
  return parseExtra(o.extraInfo).servicioNombre || 'Servicio';
}

export function piecesCount(o: Order) {
  const items: any[] = Array.isArray(o.items) ? o.items : [];
  const n = items.reduce((s, it) => s + (Number(it.cantidad) || 1), 0);
  return n || Number(parseExtra(o.extraInfo).cantidadPares) || 1;
}

export function matchesSearch(o: Order, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return String(o.numeroPedido).includes(s.replace('#', ''))
    || String(o.nombreCliente || '').toLowerCase().includes(s)
    || String(o.telefonoCliente || '').replace(/\D/g, '').includes(s.replace(/\D/g, '') || '§');
}

/* ── Siguiente acción ───────────────────────────────────────────────────── */

export type Tone = 'neutral' | 'warn' | 'ok' | 'info' | 'danger';

export type Action =
  | { kind: 'estado'; label: string; estado: string }
  | { kind: 'quote'; label: string }
  | { kind: 'pay'; label: string; entregar: boolean }
  | { kind: 'handover'; label: string }
  | { kind: 'cancel'; label: string }
  | { kind: 'confirm'; label: string; title: string; text: string; estado: string; ok: string };

export type Step = {
  status: string;
  tone: Tone;
  primary: Action | null;
  secondary: Action | null;
  /** Prioridad para "Para hacer ahora" (menor = más urgente). null = no requiere acción del local. */
  priority: number | null;
  processIndex: number;
};

export function nextStep(o: Order, process: { estado: string; label: string }[], w: LaundryWords): Step {
  const ex = parseExtra(o.extraInfo);
  const st = o.estado;
  const home = isHome(o);
  const paid = isPaid(o);
  const dName = driverName(ex);
  const procIdx = process.findIndex((p) => p.estado === st);
  const r: Step = { status: '', tone: 'neutral', primary: null, secondary: null, priority: null, processIndex: procIdx };

  switch (st) {
    case 'SOLICITADA':
    case 'PENDIENTE_RETIRO':
      r.status = ex.fechaHoraRetiro ? `Pidió retiro para ${String(ex.fechaHoraRetiro).toLowerCase()}` : 'Pidió retiro a domicilio';
      r.tone = 'warn';
      r.primary = { kind: 'estado', label: 'Confirmar', estado: 'ESPERANDO_REPARTIDOR_RETIRO' };
      r.secondary = { kind: 'cancel', label: 'Rechazar' };
      r.priority = 1;
      break;
    case 'ESPERANDO_REPARTIDOR_RETIRO':
    case 'ESPERANDO_ACEPTACION_REPARTIDOR':
      r.status = 'Buscando repartidor para el retiro';
      r.secondary = { kind: 'cancel', label: 'Cancelar' };
      break;
    case 'REPARTIDOR_EN_CAMINO':
      r.status = `${dName} va donde el cliente`;
      r.tone = 'info';
      r.secondary = {
        kind: 'confirm', label: 'Confirmar retiro',
        title: `Confirmar retiro #${o.numeroPedido}`,
        text: `Úsalo solo si el cliente no pudo ingresar el código y confirmaste por teléfono que ya entregó ${w.tusCosas.replace('tus ', 'sus ')}. Quedará registrado a tu nombre.`,
        estado: 'RECOGIDO', ok: 'Sí, ya retiró',
      };
      break;
    case 'RECOGIDO':
      r.status = `${dName} trae ${w.lasCosas} al local`;
      r.tone = 'info';
      break;
    case 'RECIBIDO':
    case 'RETIRADO':
      r.status = home ? `Llegó al local · estimado ${money(ex.cotizacion?.estimado ?? o.subtotal)}` : 'Recibida en el local';
      r.tone = 'warn';
      r.primary = { kind: 'quote', label: 'Revisar y fijar precio' };
      r.priority = 3;
      break;
    case 'CAMBIOS_SOLICITADOS':
      r.status = `Esperando que el cliente apruebe ${money(o.subtotal)}`;
      r.tone = 'warn';
      r.primary = {
        kind: 'confirm', label: 'Aprobó por teléfono',
        title: `¿El cliente aprobó ${money(o.total)}?`,
        text: 'Usa esto si el cliente te confirmó por teléfono o en persona. Quedará registrado.',
        estado: 'ACEPTADO', ok: 'Sí, aprobó',
      };
      r.secondary = { kind: 'quote', label: 'Cambiar precio' };
      r.priority = 6;
      break;
    case 'ACEPTADO':
    case 'INSPECCIONADO':
    case 'PRODUCTOS_CONFIRMADOS':
    case 'CAMBIOS_ACEPTADOS':
      r.status = `Precio aprobado: ${money(o.subtotal)}`;
      r.tone = 'ok';
      r.primary = { kind: 'estado', label: `Empezar ${(process[0]?.label || 'proceso').toLowerCase()}`, estado: process[0]?.estado || 'EN_PROCESO' };
      r.priority = 4;
      break;
    case 'LISTO':
    case 'LISTO_PARA_ENTREGA':
      r.status = ex.devolverSinServicio
        ? 'No aceptó el precio: devolver sin procesar (solo cobra el envío)'
        : home ? 'Lista para enviar' : 'Lista para que el cliente la retire';
      r.tone = ex.devolverSinServicio ? 'warn' : 'ok';
      r.primary = home
        ? { kind: 'estado', label: 'Pedir repartidor', estado: 'ESPERANDO_REPARTIDOR_ENTREGA' }
        : paid ? { kind: 'estado', label: 'Entregar al cliente', estado: 'ENTREGADO' } : { kind: 'pay', label: 'Cobrar y entregar', entregar: true };
      r.priority = home ? 2 : 7;
      break;
    case 'ESPERANDO_REPARTIDOR_ENTREGA':
      r.status = 'Buscando repartidor para la entrega';
      break;
    case 'REPARTIDOR_ASIGNADO':
      r.status = `${dName} viene al local`;
      r.tone = 'info';
      break;
    case 'REPARTIDOR_EN_LOCAL':
      r.status = `${dName} está esperando en el local`;
      r.tone = 'danger';
      r.primary = { kind: 'handover', label: `Entregar a ${dName.split(' ')[0]}` };
      r.priority = 0;
      break;
    case 'ENTREGADO_A_REPARTIDOR':
    case 'EN_RUTA_ENTREGA':
      r.status = `${dName} va donde el cliente`;
      r.tone = 'info';
      break;
    case 'ESPERANDO_CLIENTE':
      r.status = `${dName} llegó donde el cliente`;
      r.tone = 'info';
      break;
    case 'ENTREGADO':
    case 'FINALIZADA':
    case 'FINALIZADO':
    case 'COMPLETADO':
      r.status = 'Entregada';
      r.tone = 'ok';
      break;
    case 'CANCELADO':
    case 'CANCELADA':
      r.status = ex.motivoCancelacion ? `Cancelada: ${ex.motivoCancelacion}` : 'Cancelada';
      r.tone = 'neutral';
      break;
    default:
      if (procIdx >= 0) {
        r.status = process[procIdx].label;
        r.tone = 'info';
        const next = process[procIdx + 1];
        r.primary = next ? { kind: 'estado', label: `Pasar a ${next.label.toLowerCase()}`, estado: next.estado } : { kind: 'estado', label: 'Marcar como lista', estado: 'LISTO' };
      } else {
        r.status = 'En proceso';
        r.tone = 'info';
        r.primary = { kind: 'estado', label: `Pasar a ${(process[0]?.label || 'proceso').toLowerCase()}`, estado: process[0]?.estado || 'EN_PROCESO' };
      }
      r.priority = 5;
  }
  return r;
}

export const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-slate-600',
  warn: 'text-amber-700',
  ok: 'text-emerald-700',
  info: 'text-sky-700',
  danger: 'text-rose-700',
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-slate-300',
  warn: 'bg-amber-500',
  ok: 'bg-emerald-500',
  info: 'bg-sky-500',
  danger: 'bg-rose-500',
};

/** Nombres legibles para el historial (extraInfo.timeline). */
export function readableState(estado: string) {
  const map: Record<string, string> = {
    PENDIENTE_RETIRO: 'Solicitud recibida', SOLICITADA: 'Solicitud recibida',
    ESPERANDO_REPARTIDOR_RETIRO: 'Confirmada · buscando repartidor', REPARTIDOR_EN_CAMINO: 'Repartidor en camino al cliente',
    RECOGIDO: 'Retirada donde el cliente', RECIBIDO: 'Recibida en el local', CAMBIOS_SOLICITADOS: 'Nuevo precio enviado al cliente',
    ACEPTADO: 'Precio aprobado', EN_PROCESO: 'En proceso', EN_LAVADO: 'En lavado', EN_SECADO: 'En secado',
    EN_ACABADOS: 'En acabados', LISTO: 'Lista', ESPERANDO_REPARTIDOR_ENTREGA: 'Buscando repartidor para la entrega',
    REPARTIDOR_ASIGNADO: 'Repartidor asignado', REPARTIDOR_EN_LOCAL: 'Repartidor en el local',
    ENTREGADO_A_REPARTIDOR: 'Entregada al repartidor', EN_RUTA_ENTREGA: 'En camino al cliente',
    ENTREGADO: 'Entregada al cliente', CANCELADO: 'Cancelada',
  };
  return map[estado] || estado.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
