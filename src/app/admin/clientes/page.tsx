'use client';
/**
 * CLIENTES — quiénes son, cuánto vuelven y qué han pedido.
 * Lista con filtros rápidos (frecuentes, nuevos, sin volver, con orden abierta), búsqueda y orden;
 * al tocar un cliente se abre su ficha rápida con historial, fotos y acciones (WhatsApp, llamar, nueva orden).
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users, Search, Phone, MessageCircle, X, Loader2, Lock, ChevronRight, Star, Plus, ArrowUpRight, Repeat, Sparkles,
  Clock, PackageOpen, CalendarDays, ImageIcon, MapPin, Mail, ArrowDownUp,
} from 'lucide-react';
import { isLaundryOrShoeCareBusiness } from '@/lib/businessTypeHelper';

type Cliente = {
  id: string; nombre: string; telefono: string | null; email?: string | null;
  totalReservas: number; totalGastado: string | null; ratingPromedio?: number; totalReviews?: number;
  createdAt?: string; ultimaVisita?: string | null; pedidosAbiertos?: number; direccion?: string | null;
  origen?: 'cliente' | 'pedidos'; isLocked?: boolean; lockReason?: string;
};
type Filtro = 'todos' | 'frecuentes' | 'nuevos' | 'inactivos' | 'abiertos';
type Orden = 'reciente' | 'gasto' | 'visitas' | 'nombre';

const DAY = 86400000;
const money = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;
const days = (d?: string | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / DAY) : null);

function ago(d?: string | null) {
  const n = days(d);
  if (n === null) return '—';
  if (n <= 0) return 'Hoy';
  if (n === 1) return 'Ayer';
  if (n < 30) return `Hace ${n} días`;
  const m = Math.floor(n / 30);
  if (m < 12) return `Hace ${m} ${m === 1 ? 'mes' : 'meses'}`;
  const y = Math.floor(m / 12);
  return `Hace ${y} ${y === 1 ? 'año' : 'años'}`;
}
const fmtDate = (d?: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('es-EC', opts) : '—';

function waLink(phone?: string | null, text?: string) {
  let n = String(phone || '').replace(/\D/g, '');
  if (n.startsWith('0') && n.length === 10) n = `593${n.slice(1)}`;
  return n.length >= 9 ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null;
}

const hidden = (c: Cliente) => c.lockReason === 'PLAN_LIMIT' || c.nombre === 'Cliente Protegido';
const isNew = (c: Cliente) => (days(c.createdAt) ?? 999) <= 30;
const isFrequent = (c: Cliente) => (c.totalReservas || 0) >= 3;
const isInactive = (c: Cliente) => (c.totalReservas || 0) > 0 && (days(c.ultimaVisita) ?? 0) > 60;

const AVATAR_TONES = ['bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-700', 'bg-teal-100 text-teal-700'];
function Avatar({ c, size = 'md' }: { c: Cliente; size?: 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'size-14 text-lg' : 'size-10 text-sm';
  if (hidden(c)) return <span className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400`}><Lock size={size === 'lg' ? 20 : 15} /></span>;
  const name = c.nombre || '?';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const tone = AVATAR_TONES[(name.charCodeAt(0) + name.length) % AVATAR_TONES.length];
  return <span className={`${cls} ${tone} flex shrink-0 items-center justify-center rounded-full font-semibold`}>{initials || '?'}</span>;
}

function Tags({ c, laundry }: { c: Cliente; laundry: boolean }) {
  const t: [string, string][] = [];
  if ((c.pedidosAbiertos || 0) > 0) t.push([laundry ? `${c.pedidosAbiertos} ${c.pedidosAbiertos === 1 ? 'orden abierta' : 'órdenes abiertas'}` : 'Pedido abierto', 'bg-sky-50 text-sky-700']);
  if (isFrequent(c)) t.push(['Frecuente', 'bg-emerald-50 text-emerald-700']);
  if (isNew(c)) t.push(['Nuevo', 'bg-violet-50 text-violet-700']);
  if (isInactive(c)) t.push(['Sin volver', 'bg-amber-50 text-amber-800']);
  if (!t.length) return null;
  return <span className="flex flex-wrap gap-1">{t.map(([l, cls]) => <span key={l} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{l}</span>)}</span>;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [negocio, setNegocio] = useState<any>(null);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [orden, setOrden] = useState<Orden>('reciente');
  const [limit, setLimit] = useState(60);
  const [open, setOpen] = useState<Cliente | null>(null);

  useEffect(() => {
    fetch('/api/clientes', { cache: 'no-store' })
      .then(async (r) => { const d = await r.json().catch(() => null); if (!r.ok) throw new Error(d?.error || 'No se pudieron cargar los clientes.'); return d; })
      .then((d) => setClientes(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    fetch('/api/negocio').then((r) => (r.ok ? r.json() : null)).then(setNegocio).catch(() => {});
  }, []);

  const laundry = negocio ? isLaundryOrShoeCareBusiness(negocio) : false;
  const visitas = laundry ? 'Órdenes' : 'Visitas';

  const counts = useMemo(() => ({
    todos: clientes.length,
    frecuentes: clientes.filter(isFrequent).length,
    nuevos: clientes.filter(isNew).length,
    inactivos: clientes.filter(isInactive).length,
    abiertos: clientes.filter((c) => (c.pedidosAbiertos || 0) > 0).length,
  }), [clientes]);
  const ocultos = clientes.filter(hidden).length;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const sd = s.replace(/\D/g, '');
    let r = clientes.filter((c) => {
      if (filtro === 'frecuentes' && !isFrequent(c)) return false;
      if (filtro === 'nuevos' && !isNew(c)) return false;
      if (filtro === 'inactivos' && !isInactive(c)) return false;
      if (filtro === 'abiertos' && !(c.pedidosAbiertos || 0)) return false;
      if (!s) return true;
      return (c.nombre || '').toLowerCase().includes(s) || (sd.length >= 3 && String(c.telefono || '').replace(/\D/g, '').includes(sd)) || (c.email || '').toLowerCase().includes(s);
    });
    const t = (d?: string | null) => (d ? new Date(d).getTime() : 0);
    r = [...r].sort((a, b) => {
      if (orden === 'gasto') return (Number(b.totalGastado) || 0) - (Number(a.totalGastado) || 0);
      if (orden === 'visitas') return (b.totalReservas || 0) - (a.totalReservas || 0);
      if (orden === 'nombre') return (a.nombre || '').localeCompare(b.nombre || '', 'es');
      return t(b.ultimaVisita || b.createdAt) - t(a.ultimaVisita || a.createdAt);
    });
    return r;
  }, [clientes, q, filtro, orden]);

  useEffect(() => setLimit(60), [q, filtro, orden]);

  const filters: [Filtro, string, number, any, string][] = [
    ['todos', 'Todos', counts.todos, Users, 'text-slate-900'],
    ['frecuentes', 'Frecuentes', counts.frecuentes, Repeat, 'text-emerald-600'],
    ['nuevos', 'Nuevos este mes', counts.nuevos, Sparkles, 'text-violet-600'],
    ['inactivos', 'Sin volver (+60 días)', counts.inactivos, Clock, 'text-amber-600'],
    ...(counts.abiertos ? [['abiertos', laundry ? 'Con orden abierta' : 'Con pedido abierto', counts.abiertos, PackageOpen, 'text-sky-600'] as [Filtro, string, number, any, string]] : []),
  ];

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={28} /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-20">
      {/* Columnas de la tabla en CSS normal: no dependen de clases generadas por Tailwind. */}
      <style>{`
        .cli-filters{scrollbar-width:none}
        .cli-filters::-webkit-scrollbar{display:none}
        .cli-head{display:none}
        .cli-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:.75rem;row-gap:.25rem}
        .cli-tags{grid-column:1 / -1;padding-left:52px}
        @media (min-width:640px){.cli-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}}
        @media (min-width:768px){
          .cli-head{display:grid;align-items:center}
          .cli-cols{grid-template-columns:minmax(0,2.2fr) 90px 110px 130px minmax(0,1.3fr) 40px;column-gap:1rem}
        }
      `}</style>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">{clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}. Toca uno para ver su historial y escribirle.</p>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>}

      {ocultos > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-200 sm:flex-row sm:items-center">
          <Lock size={18} className="shrink-0 text-amber-600" />
          <p className="flex-1">
            <b>{ocultos} {ocultos === 1 ? 'cliente está oculto' : 'clientes están ocultos'}</b> porque tu plan actual no permite ver sus datos
            {clientes.some((c) => c.lockReason === 'PLAN_LIMIT') ? ' (superaste el límite de citas del mes)' : ''}.
          </p>
          <Link href="/admin/plan" className="inline-flex items-center gap-1 rounded-xl bg-amber-900 px-3.5 py-2 font-semibold text-white">Ver planes <ArrowUpRight size={15} /></Link>
        </div>
      )}

      {/* Filtros rápidos */}
      <div className="cli-filters -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
        {filters.map(([k, label, n, Icon, tone]) => (
          <button key={k} onClick={() => setFiltro(k)} aria-pressed={filtro === k}
            className={`shrink-0 rounded-2xl p-3.5 text-left transition sm:p-4 ${filtro === k ? 'bg-slate-900 text-white shadow-sm' : 'bg-white ring-1 ring-slate-200/80 hover:ring-slate-300'}`}>
            <span className={`flex items-center gap-1.5 whitespace-nowrap text-xs font-medium sm:text-sm ${filtro === k ? 'text-white/70' : 'text-slate-500'}`}><Icon size={14} /> {label}</span>
            <span className={`mt-1 block text-2xl font-bold tabular-nums ${filtro === k ? 'text-white' : tone}`}>{n}</span>
          </button>
        ))}
      </div>

      {/* Búsqueda + orden */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, celular o correo"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
          {q && <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700" aria-label="Limpiar"><X size={16} /></button>}
        </label>
        <label className="relative">
          <ArrowDownUp size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} aria-label="Ordenar"
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 sm:w-auto">
            <option value="reciente">Última visita</option>
            <option value="gasto">Más gastado</option>
            <option value="visitas">Más {visitas.toLowerCase()}</option>
            <option value="nombre">Nombre (A-Z)</option>
          </select>
        </label>
      </div>

      {/* Lista */}
      {list.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Users className="mx-auto size-9 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-800">{clientes.length === 0 ? 'Aún no tienes clientes' : 'Nadie coincide con la búsqueda'}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            {clientes.length === 0
              ? (laundry ? 'Cada orden que recibes (a domicilio o en el local) suma al cliente aquí, con su historial.' : 'Cada reserva o pedido suma al cliente aquí, con su historial.')
              : 'Prueba con otro nombre o número, o cambia el filtro.'}
          </p>
          {clientes.length === 0 && laundry && <Link href="/admin/recepciones" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> Recibir una orden</Link>}
          {clientes.length > 0 && filtro !== 'todos' && <button onClick={() => { setFiltro('todos'); setQ(''); }} className="mt-4 text-sm font-semibold text-slate-900 underline">Ver todos</button>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
          <div className="cli-head cli-cols border-b border-slate-100 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            <span>Cliente</span><span className="text-right">{visitas}</span><span className="text-right">Gastado</span><span>Última visita</span><span>Estado</span><span />
          </div>
          <ul className="divide-y divide-slate-100">
            {list.slice(0, limit).map((c) => {
              const locked = hidden(c);
              const wa = !locked ? waLink(c.telefono, `Hola ${(c.nombre || '').split(' ')[0]}, te escribimos de ${negocio?.nombre || 'nuestro negocio'}.`) : null;
              return (
                <li key={c.id} className="group relative">
                  <button onClick={() => setOpen(c)} className="cli-row cli-cols w-full px-4 py-3.5 text-left transition hover:bg-slate-50 md:px-5">
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar c={c} />
                      <span className="min-w-0">
                        <span className={`block truncate font-semibold ${locked ? 'text-slate-400' : 'text-slate-900'}`}>{locked ? 'Cliente oculto por tu plan' : c.nombre}</span>
                        <span className="block truncate text-sm text-slate-500">{locked ? 'Datos protegidos' : (c.telefono || 'Sin celular')}</span>
                      </span>
                    </span>
                    {/* Celular: resumen a la derecha */}
                    <span className="text-right md:hidden">
                      <span className="block font-semibold tabular-nums text-slate-900">{c.totalGastado !== null && !locked ? money(c.totalGastado) : '—'}</span>
                      <span className="block text-xs text-slate-500">{c.totalReservas || 0} {(c.totalReservas || 0) === 1 ? (laundry ? 'orden' : 'visita') : visitas.toLowerCase()} · {ago(c.ultimaVisita || c.createdAt).toLowerCase()}</span>
                    </span>
                    <span className="cli-tags md:hidden"><Tags c={c} laundry={laundry} /></span>
                    {/* Escritorio: columnas */}
                    <span className="hidden text-right font-medium tabular-nums text-slate-900 md:block">{c.totalReservas || 0}</span>
                    <span className="hidden text-right font-medium tabular-nums text-slate-900 md:block">{c.totalGastado !== null && !locked ? money(c.totalGastado) : '—'}</span>
                    <span className="hidden text-sm text-slate-600 md:block">{ago(c.ultimaVisita || c.createdAt)}</span>
                    <span className="hidden md:block"><Tags c={c} laundry={laundry} /></span>
                    <span className="hidden justify-end md:flex"><ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500" /></span>
                  </button>
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="absolute right-12 top-1/2 hidden -translate-y-1/2 rounded-lg p-2 text-emerald-600 opacity-0 transition hover:bg-emerald-50 group-hover:opacity-100 md:block" aria-label={`WhatsApp a ${c.nombre}`} title="Escribir por WhatsApp">
                      <MessageCircle size={17} />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
          {list.length > limit && (
            <button onClick={() => setLimit((l) => l + 60)} className="w-full border-t border-slate-100 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver más ({list.length - limit} restantes)</button>
          )}
        </div>
      )}

      {open && <ClientDrawer c={open} laundry={laundry} visitas={visitas} negocioNombre={negocio?.nombre} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ── Ficha rápida ─────────────────────────────────────────────────────── */

const ESTADOS: Record<string, [string, string]> = {
  ENTREGADO: ['Entregada', 'bg-emerald-50 text-emerald-700'], FINALIZADO: ['Finalizada', 'bg-emerald-50 text-emerald-700'], FINALIZADA: ['Finalizada', 'bg-emerald-50 text-emerald-700'], COMPLETADO: ['Completada', 'bg-emerald-50 text-emerald-700'],
  CANCELADO: ['Cancelada', 'bg-slate-100 text-slate-500'], CANCELADA: ['Cancelada', 'bg-slate-100 text-slate-500'],
  LISTO: ['Lista', 'bg-sky-50 text-sky-700'],
  completed: ['Atendida', 'bg-emerald-50 text-emerald-700'], finalizada: ['Atendida', 'bg-emerald-50 text-emerald-700'], cancelled: ['Cancelada', 'bg-slate-100 text-slate-500'], cancelada: ['Cancelada', 'bg-slate-100 text-slate-500'],
  confirmed: ['Confirmada', 'bg-sky-50 text-sky-700'], pending: ['Pendiente', 'bg-amber-50 text-amber-800'],
};
const estadoChip = (e: string) => ESTADOS[e] || ['En curso', 'bg-sky-50 text-sky-700'];

function ClientDrawer({ c, laundry, visitas, negocioNombre, onClose }: { c: Cliente; laundry: boolean; visitas: string; negocioNombre?: string; onClose: () => void }) {
  const locked = hidden(c);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<'historial' | 'fotos'>('historial');

  useEffect(() => {
    if (locked) return;
    const sp = new URLSearchParams();
    if (c.telefono) sp.set('telefono', c.telefono);
    if (c.origen !== 'pedidos') sp.set('clienteId', c.id);
    fetch(`/api/clientes/actividad?${sp}`, { cache: 'no-store' })
      .then(async (r) => { const d = await r.json().catch(() => null); if (!r.ok) throw new Error(d?.error || 'No se pudo cargar el historial.'); return d; })
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [c, locked]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const timeline = useMemo(() => {
    if (!data) return [];
    const a = (data.ordenes || []).map((o: any) => ({ kind: 'orden', fecha: o.fecha, ...o }));
    const b = (data.citas || []).map((x: any) => ({ kind: 'cita', ...x }));
    return [...a, ...b].sort((x: any, y: any) => +new Date(y.fecha) - +new Date(x.fecha));
  }, [data]);

  const first = (c.nombre || '').split(' ')[0];
  const wa = !locked ? waLink(c.telefono, `Hola ${first}, te escribimos de ${negocioNombre || 'nuestro negocio'}.`) : null;
  const ticket = c.totalReservas ? (Number(c.totalGastado) || 0) / c.totalReservas : 0;
  const fotos = data?.fotos || [];

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-slate-900/40" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Ficha de ${c.nombre}`}>
      <div className="flex h-full w-full max-w-xl flex-col bg-slate-50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="bg-white px-5 pb-5 pt-4 ring-1 ring-slate-200/80">
          <div className="flex justify-end"><button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X size={20} /></button></div>
          <div className="flex items-center gap-4">
            <Avatar c={c} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold text-slate-900">{locked ? 'Cliente oculto por tu plan' : c.nombre}</h2>
              <p className="text-sm text-slate-500">{locked ? 'Mejora tu plan para ver sus datos' : (c.telefono || 'Sin celular')}{c.createdAt ? ` · cliente desde ${fmtDate(c.createdAt, { month: 'short', year: 'numeric' })}` : ''}</p>
              <div className="mt-1.5"><Tags c={c} laundry={laundry} /></div>
            </div>
          </div>

          {!locked && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white hover:brightness-105"><MessageCircle size={16} /> WhatsApp</a>}
              {c.telefono && <a href={`tel:${c.telefono}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Phone size={16} /> Llamar</a>}
              {laundry ? (
                <Link href={`/admin/recepciones?telefono=${encodeURIComponent(c.telefono || '')}&nombre=${encodeURIComponent(c.nombre || '')}`} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 sm:col-span-1"><Plus size={16} /> Nueva orden</Link>
              ) : c.origen !== 'pedidos' ? (
                <Link href={`/admin/clientes/${c.id}`} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 sm:col-span-1">Ficha completa <ArrowUpRight size={15} /></Link>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {locked ? (
            <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200/80">
              <Lock className="mx-auto text-amber-500" />
              <p className="mt-2 font-semibold text-slate-900">Datos protegidos</p>
              <p className="mt-1 text-sm text-slate-500">Tu plan actual no permite ver el nombre, el contacto ni el historial de este cliente.</p>
              <Link href="/admin/plan" className="mt-4 inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Ver planes <ArrowUpRight size={15} /></Link>
            </div>
          ) : (
            <>
              {/* Números */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  [visitas, String(c.totalReservas || 0)],
                  ['Gastado', c.totalGastado !== null ? money(c.totalGastado) : '—'],
                  ['Promedio', c.totalGastado !== null && c.totalReservas ? money(ticket) : '—'],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">
                    <p className="text-xs text-slate-500">{l}</p>
                    <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{v}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-200/80">
                <p className="flex items-center gap-2 text-slate-700"><CalendarDays size={15} className="text-slate-400" /> Última visita: <b className="font-semibold text-slate-900">{c.ultimaVisita ? `${fmtDate(c.ultimaVisita)} (${ago(c.ultimaVisita).toLowerCase()})` : '—'}</b></p>
                {c.direccion && <p className="flex items-start gap-2 text-slate-700"><MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" /> {c.direccion}</p>}
                {(c.email || data?.cliente?.email) && <p className="flex items-center gap-2 text-slate-700"><Mail size={15} className="text-slate-400" /> {c.email || data?.cliente?.email}</p>}
                {(c.totalReviews || 0) > 0 && <p className="flex items-center gap-2 text-slate-700"><Star size={15} className="text-amber-500" fill="currentColor" /> Califica con {Number(c.ratingPromedio || 0).toFixed(1)} ({c.totalReviews} {c.totalReviews === 1 ? 'opinión' : 'opiniones'})</p>}
                {isInactive(c) && wa && (
                  <a href={waLink(c.telefono, `Hola ${first} 👋 Hace tiempo no te vemos en ${negocioNombre || 'nuestro negocio'}. ¿Te ayudamos con algo esta semana?`) || '#'} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 rounded-xl bg-amber-50 p-3 font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100">
                    <Clock size={15} /> No vuelve hace {days(c.ultimaVisita)} días. Escríbele para invitarlo a volver <ChevronRight size={15} className="ml-auto" />
                  </a>
                )}
              </div>

              {/* Historial / fotos */}
              <div className="inline-flex rounded-xl bg-slate-200/60 p-1" role="tablist">
                {([['historial', 'Historial'], ['fotos', `Fotos${fotos.length ? ` (${fotos.length})` : ''}`]] as const).map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>{l}</button>
                ))}
              </div>

              {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
              {!data && !err && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />)}</div>}

              {data && tab === 'historial' && (
                timeline.length === 0 ? (
                  <p className="rounded-2xl bg-white p-5 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Sin historial todavía.</p>
                ) : (
                  <ul className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 divide-y divide-slate-100">
                    {timeline.map((x: any) => {
                      const [label, cls] = estadoChip(x.estado);
                      const href = x.kind === 'orden' ? (x.esServicio ? `/admin/ordenes-servicio?orden=${x.id}` : '/admin/pedidos-online') : '/admin/citas';
                      return (
                        <li key={`${x.kind}-${x.id}`}>
                          <Link href={href} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                            <span className="mt-0.5 w-12 shrink-0 text-center">
                              <span className="block text-lg font-bold leading-none text-slate-900">{new Date(x.fecha).getDate()}</span>
                              <span className="block text-xs uppercase text-slate-500">{fmtDate(x.fecha, { month: 'short' }).replace('.', '')}</span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate font-semibold text-slate-900">{x.kind === 'orden' ? `Orden #${x.numero}` : x.servicio}</span>
                                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
                              </span>
                              <span className="block truncate text-sm text-slate-500">
                                {x.kind === 'orden' ? (x.items?.join(', ') || (x.tipoEntrega === 'DOMICILIO' ? 'A domicilio' : 'En el local')) : (x.profesional ? `Con ${x.profesional}` : 'Cita')}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block font-semibold tabular-nums text-slate-900">{x.kind === 'orden' ? (x.total !== null ? money(x.total) : '—') : (x.precio !== null ? money(x.precio) : '—')}</span>
                              {x.kind === 'orden' && !['CANCELADO', 'CANCELADA'].includes(x.estado) && <span className={`text-xs ${x.pagado ? 'text-emerald-700' : 'text-amber-700'}`}>{x.pagado ? 'Pagada' : 'Por cobrar'}</span>}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )
              )}

              {data && tab === 'fotos' && (
                fotos.length === 0 ? (
                  <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200/80">
                    <ImageIcon className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">{laundry ? 'Las fotos que tomes al recibir o entregar sus artículos aparecerán aquí.' : 'Sin fotos.'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {fotos.map((f: any, i: number) => (
                      <a key={`${f.url}-${i}`} href={f.url} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.url} alt={`Orden #${f.numero}`} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 text-[11px] font-medium text-white">#{f.numero} · {f.tipo === 'RECEPCION' ? 'recibido' : 'entregado'}</span>
                      </a>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
