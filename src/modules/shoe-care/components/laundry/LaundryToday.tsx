'use client';
/**
 * INICIO de la lavandería: qué pasa hoy y qué necesita al local ahora mismo.
 * El trabajo detallado se hace en Órdenes (/admin/ordenes-servicio).
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowRight, ExternalLink, Bike, Inbox, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';
import { getCanonicalLogistics } from '@/core/logistics/CanonicalLogisticsService';
import { wordsFor } from '@/lib/laundry/wording';
import {
  STAGES, Order, stageOf, processSteps, nextStep, owesPayment, money, isPaid, isToday, parseExtra, isDelivered,
  since, TONE_DOT, isHome, itemsSummary, driverName,
} from './flow';
import {
  brandVars, btnPrimary, btnSecondary, OrderDrawer, useLaundryOrders, useLaundryActions, useToast, useDriverLegs,
} from './shared';

export default function LaundryToday({ negocio }: { negocio: any }) {
  const negocioId: string = negocio?.id;
  const brand: string = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(negocio?.colorPrimario || '')) ? negocio.colorPrimario : '#0e7490';
  const process = useMemo(() => processSteps(negocio), [negocio]);
  const w = useMemo(() => wordsFor(negocio), [negocio]);

  const { notify, toastNode } = useToast();
  const { orders, loading, reload, setLoading } = useLaundryOrders(negocioId);
  const { run, busy, modalNode } = useLaundryActions({ negocioId, brand, w, process, reload, notify });
  const [openId, setOpenId] = useState<string | null>(null);

  // Lo que necesita al local, de lo más urgente a lo menos (y lo más antiguo primero).
  const todo = useMemo(() => orders
    .map((o) => ({ o, s: nextStep(o, process, w) }))
    .filter((x) => x.s.priority !== null && x.s.primary)
    .sort((a, b) => (a.s.priority! - b.s.priority!) || (+new Date(a.o.createdAt) - +new Date(b.o.createdAt))), [orders, process, w]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of orders) {
      const k = stageOf(o.estado);
      if (!k) continue;
      if (k === 'cerradas' && !isToday(o.updatedAt)) continue;
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [orders]);

  const waiting = orders.filter((o) => o.estado === 'REPARTIDOR_EN_LOCAL');
  const porCobrar = orders.filter(owesPayment);
  const legs = useDriverLegs(orders, negocio?.tipoNegocio, getCanonicalLogistics);
  const pendingLegs = legs.filter((l) => !l.paid);
  const cobradoHoy = orders.filter((o) => isPaid(o) && isToday(parseExtra(o.extraInfo).fechaPago)).reduce((s, o) => s + Number(parseExtra(o.extraInfo).montoPagado || o.total || 0), 0);
  const entregadasHoy = orders.filter((o) => isDelivered(o) && isToday(o.updatedAt)).length;
  const nuevasHoy = orders.filter((o) => isToday(o.createdAt)).length;
  const openOrder = orders.find((o) => o.id === openId) || null;
  const todayRaw = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16" style={brandVars(brand)}>
      {/* Encabezado */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {negocio?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={negocio.logoUrl} alt="" className="size-12 rounded-2xl object-cover ring-1 ring-slate-200" />
          ) : (
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--lb)] text-lg font-bold text-[var(--lb-ink)]">{String(negocio?.nombre || 'L').charAt(0).toUpperCase()}</span>
          )}
          <div className="min-w-0">
            <p className="text-sm text-slate-500">{today}</p>
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{negocio?.nombre || 'Mi lavandería'}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/recepciones" className={btnPrimary}><Plus size={16} /> Recibir en el local</Link>
          <Link href="/admin/ordenes-servicio" className={btnSecondary}>Ver órdenes <ArrowRight size={15} /></Link>
          {negocio?.slug && <a href={`/${negocio.slug}`} target="_blank" rel="noopener noreferrer" className={btnSecondary}>Mi página <ExternalLink size={14} /></a>}
        </div>
      </div>

      {/* Lo urgente */}
      {waiting.length > 0 && (
        <button onClick={() => setOpenId(waiting[0].id)} className="flex w-full items-center gap-3 rounded-2xl bg-rose-50 p-4 text-left ring-1 ring-rose-200 transition hover:ring-rose-300">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white"><Bike size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-rose-900">
              {waiting.length === 1 ? `${driverName(parseExtra(waiting[0].extraInfo))} está esperando en el local` : `${waiting.length} repartidores esperando en el local`}
            </span>
            <span className="block text-sm text-rose-800/80">Pídele su código y entrégale {w.lasCosas} de la orden #{waiting[0].numeroPedido}.</span>
          </span>
          <ChevronRight size={18} className="text-rose-400" />
        </button>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Para hacer ahora */}
        <section aria-labelledby="todo-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 id="todo-title" className="text-lg font-semibold text-slate-900">Para hacer ahora</h2>
              <p className="text-sm text-slate-500">{todo.length ? `${todo.length} ${todo.length === 1 ? 'orden necesita' : 'órdenes necesitan'} algo de ti` : 'Todo al día'}</p>
            </div>
            <button onClick={() => { setLoading(true); reload(); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Actualizar">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading && !orders.length ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
          ) : todo.length === 0 ? (
            <div className="rounded-2xl bg-white px-6 py-10 text-center ring-1 ring-slate-200/80">
              <Sparkles className="mx-auto size-8 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-800">{orders.length ? 'No hay nada pendiente de tu lado' : 'Aún no tienes órdenes'}</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                {orders.length
                  ? 'Las órdenes en camino o en manos de repartidores siguen solas. Te avisamos aquí cuando necesiten algo.'
                  : 'Comparte tu página para recibir solicitudes de retiro, o registra una orden cuando un cliente llegue al local.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
              {todo.slice(0, 10).map(({ o, s }) => (
                <li key={o.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <button onClick={() => setOpenId(o.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <span className={`mt-2 size-2.5 shrink-0 rounded-full ${TONE_DOT[s.tone]}`} aria-hidden />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-2 text-sm">
                        <span className="font-bold text-slate-900">#{o.numeroPedido}</span>
                        <span className="truncate font-medium text-slate-800">{o.nombreCliente}</span>
                        <span className="text-xs text-slate-400">{isHome(o) ? 'Domicilio' : 'Local'} · {since(parseExtra(o.extraInfo).stateUpdatedAt || o.updatedAt)}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-600">{s.status}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400">{itemsSummary(o)} · {money(o.total)}</span>
                    </span>
                  </button>
                  <button disabled={busy === o.id} onClick={() => run(o, s.primary!)} className={`${btnPrimary} shrink-0 sm:min-w-[11rem]`}>{s.primary!.label}</button>
                </li>
              ))}
            </ul>
          )}
          {todo.length > 10 && (
            <Link href="/admin/ordenes-servicio" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">Ver las {todo.length - 10} restantes en Órdenes <ArrowRight size={14} /></Link>
          )}
        </section>

        {/* Cómo va el día */}
        <aside className="space-y-4">
          <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80" aria-labelledby="flujo-title">
            <h2 id="flujo-title" className="font-semibold text-slate-900">Cómo van las órdenes</h2>
            <ul className="mt-3 space-y-1">
              {STAGES.map((st) => (
                <li key={st.key}>
                  <Link href={`/admin/ordenes-servicio?etapa=${st.key}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50">
                    <st.Icon size={16} className="text-slate-400" />
                    <span className="flex-1 text-sm text-slate-700">{st.key === 'cerradas' ? 'Entregadas o canceladas hoy' : st.label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${counts[st.key] ? 'text-slate-900' : 'text-slate-300'}`}>{counts[st.key] || 0}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-slate-100 px-2 pt-3 text-xs text-slate-500">{nuevasHoy} {nuevasHoy === 1 ? 'orden nueva' : 'órdenes nuevas'} hoy · {entregadasHoy} {entregadasHoy === 1 ? 'entregada' : 'entregadas'}</p>
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-1" aria-label="Dinero">
            <Link href="/admin/caja" className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 transition hover:ring-slate-300">
              <p className="text-sm text-slate-500">Cobrado hoy</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(cobradoHoy)}</p>
            </Link>
            <Link href="/admin/ordenes-servicio?vista=cobros" className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 transition hover:ring-slate-300">
              <p className="text-sm text-slate-500">Por cobrar a clientes</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(porCobrar.reduce((s, o) => s + Number(o.total || 0), 0))}</p>
              <p className={`text-xs ${porCobrar.length ? 'text-amber-700' : 'text-slate-500'}`}>{porCobrar.length} {porCobrar.length === 1 ? 'orden' : 'órdenes'}</p>
            </Link>
            <Link href="/admin/ordenes-servicio?vista=repartidores" className="col-span-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 transition hover:ring-slate-300 lg:col-span-1">
              <p className="text-sm text-slate-500">Por pagar a repartidores</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(pendingLegs.reduce((s, l) => s + l.fee, 0))}</p>
              <p className={`text-xs ${pendingLegs.length ? 'text-amber-700' : 'text-slate-500'}`}>{pendingLegs.length} {pendingLegs.length === 1 ? 'viaje' : 'viajes'}</p>
            </Link>
          </section>

          {counts.confirmar ? (
            <Link href="/admin/ordenes-servicio?etapa=confirmar" className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <Inbox size={18} className="text-amber-600" />
              <span className="flex-1 text-sm text-amber-900">{counts.confirmar} {counts.confirmar === 1 ? 'solicitud espera' : 'solicitudes esperan'} tu confirmación</span>
              <ChevronRight size={16} className="text-amber-500" />
            </Link>
          ) : null}
        </aside>
      </div>

      {openOrder && <OrderDrawer order={openOrder} process={process} w={w} busy={busy === openOrder.id} onRun={run} onClose={() => setOpenId(null)} />}
      {modalNode}
      {toastNode}
    </div>
  );
}

export type { Order };
