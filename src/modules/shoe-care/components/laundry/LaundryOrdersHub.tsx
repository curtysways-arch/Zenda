'use client';
/**
 * ÓRDENES — el único lugar para trabajar las órdenes de lavandería (a domicilio y del local).
 * Pestañas por etapa con la acción siguiente de cada orden, panel de detalle, cobros
 * pendientes y pagos a repartidores.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, RefreshCw, Settings2, Wallet, X } from 'lucide-react';
import { getCanonicalLogistics } from '@/core/logistics/CanonicalLogisticsService';
import { wordsFor, tipoArticuloOf } from '@/lib/laundry/wording';
import {
  STAGES, StageKey, Order, stageOf, stageMeta, processSteps, nextStep, owesPayment, matchesSearch, money,
  isToday, parseExtra, isHome,
} from './flow';
import {
  brandVars, btnPrimary, btnSecondary, OrderCard, OrderDrawer, SettingsModal, EmptyState,
  useLaundryOrders, useLaundryActions, useToast, useDriverLegs,
} from './shared';
import DeliveriesPanel, { WAITING } from './DeliveriesPanel';

type View = 'etapas' | 'cobros' | 'repartidores';

export default function LaundryOrdersHub({ negocio }: { negocio: any }) {
  const router = useRouter();
  const params = useSearchParams();
  const negocioId: string = negocio?.id;
  const brand: string = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(negocio?.colorPrimario || '')) ? negocio.colorPrimario : '#0e7490';
  const process = useMemo(() => processSteps(negocio), [negocio]);
  const [tipoArticulo, setTipoArticulo] = useState(tipoArticuloOf(negocio));
  const w = useMemo(() => wordsFor({ ...negocio, configuracion: { ...parseExtra(negocio?.configuracion), tipoArticulo } }), [negocio, tipoArticulo]);

  const { notify, toastNode } = useToast();
  const { orders, loading, error, reload, setLoading } = useLaundryOrders(negocioId);
  const { run, busy, modalNode } = useLaundryActions({ negocioId, brand, w, process, reload, notify });

  const [view, setView] = useState<View>(() => (['cobros', 'repartidores'].includes(String(params?.get('vista'))) ? params!.get('vista') as View : 'etapas'));
  const [stage, setStage] = useState<StageKey | null>(() => {
    const e = params?.get('etapa');
    return STAGES.some((s) => s.key === e) ? (e as StageKey) : null;
  });
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(() => params?.get('orden') || null);
  const [showSettings, setShowSettings] = useState(false);

  // Compatibilidad: enlaces viejos a "nueva recepción" van a la pantalla de recibir en el local.
  useEffect(() => {
    if (params?.get('nueva')) router.replace('/admin/recepciones');
  }, [params, router]);

  const syncUrl = useCallback((next: { vista?: View; etapa?: StageKey | null }) => {
    const sp = new URLSearchParams(window.location.search);
    if (next.vista) { if (next.vista === 'etapas') sp.delete('vista'); else sp.set('vista', next.vista); }
    if (next.etapa !== undefined) { if (next.etapa) sp.set('etapa', next.etapa); else sp.delete('etapa'); }
    const qs = sp.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, []);

  const byStage = useMemo(() => {
    const m: Record<StageKey, Order[]> = { confirmar: [], retiro: [], revisar: [], proceso: [], listas: [], entrega: [], cerradas: [] };
    for (const o of orders) {
      const k = stageOf(o.estado);
      if (k) m[k].push(o);
    }
    for (const k of Object.keys(m) as StageKey[]) m[k].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    m.cerradas.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return m;
  }, [orders]);

  // Etapa inicial: la primera que pide algo del local
  useEffect(() => {
    if (stage || loading) return;
    const first = (['entrega', 'confirmar', 'revisar', 'listas', 'proceso', 'retiro'] as StageKey[])
      .find((k) => byStage[k].some((o) => nextStep(o, process, w).primary));
    setStage(first || (['confirmar', 'revisar', 'proceso', 'listas', 'retiro', 'entrega'] as StageKey[]).find((k) => byStage[k].length) || 'confirmar');
  }, [byStage, stage, loading, process, w]);

  // En celular, que la etapa elegida quede a la vista en la tira de etapas.
  useEffect(() => {
    if (stage) document.getElementById(`etapa-${stage}`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [stage]);

  const searching = q.trim().length > 0;
  const results = useMemo(() => (searching ? orders.filter((o) => matchesSearch(o, q)).slice(0, 60) : []), [orders, q, searching]);

  const porCobrar = useMemo(() => orders.filter(owesPayment).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)), [orders]);
  const legs = useDriverLegs(orders, negocio?.tipoNegocio, getCanonicalLogistics);
  const waitingDriver = useMemo(() => orders.filter((o) => WAITING.includes(o.estado)).length, [orders]);

  const openOrder = orders.find((o) => o.id === openId) || null;
  const list = stage ? byStage[stage] : [];
  const visibleList = stage === 'cerradas' ? list.slice(0, 60) : list;

  const payLegs = async (ls: typeof legs) => {
    let ok = 0;
    for (const l of ls) {
      const res = await fetch(`/api/shoe-care/orders/${l.order.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(l.tipo === 'RETIRO' ? { markPickupPaid: true } : { markDeliveryPaid: true }),
      }).catch(() => null);
      if (res?.ok) ok++;
    }
    notify(ok === ls.length ? `Marcado como pagado (${ok} ${ok === 1 ? 'viaje' : 'viajes'}).` : 'Algunos viajes no se pudieron marcar.', ok !== ls.length);
    reload();
  };

  const cards = (arr: Order[]) => (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {arr.map((o) => (
        <OrderCard key={o.id} order={o} process={process} w={w} busy={busy === o.id} onRun={run} onOpen={(x) => setOpenId(x.id)} />
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-16" style={brandVars(brand)}>
      {/* Encabezado */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Órdenes</h1>
          <p className="mt-0.5 text-sm text-slate-500">Todas las órdenes, a domicilio y del local. Cada una muestra lo que sigue.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/recepciones" className={btnPrimary}><Plus size={16} /> Recibir en el local</Link>
          <button onClick={() => setShowSettings(true)} className={`${btnSecondary} px-3`} aria-label="Qué lavas" title="Qué lavas"><Settings2 size={16} /></button>
          <button onClick={() => { setLoading(true); reload(); }} className={`${btnSecondary} px-3`} aria-label="Actualizar" title="Actualizar"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {/* Vistas + búsqueda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex w-fit max-w-full overflow-x-auto rounded-xl bg-slate-100 p-1 text-sm [scrollbar-width:none]" role="tablist">
          {([
            ['etapas', 'Por etapa', 0],
            ['cobros', 'Por cobrar', porCobrar.length],
            ['repartidores', 'Repartidores', waitingDriver],
          ] as const).map(([k, label, n]) => (
            <button key={k} role="tab" aria-selected={view === k} onClick={() => { setView(k); syncUrl({ vista: k }); }}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition ${view === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              {label}{n > 0 && <span className="rounded-md bg-slate-200/80 px-1.5 text-xs text-slate-700">{n}</span>}
            </button>
          ))}
        </div>
        {view === 'etapas' && (
          <label className="relative flex-1 sm:max-w-sm sm:ml-auto">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número, cliente o teléfono" aria-label="Buscar órdenes"
              className="w-full rounded-xl bg-white py-2.5 pl-9 pr-9 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[var(--lb)]" />
            {q && <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700" aria-label="Limpiar búsqueda"><X size={15} /></button>}
          </label>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          <span>{error}</span>
          <button onClick={() => reload()} className="font-semibold underline">Reintentar</button>
        </div>
      )}

      {view === 'etapas' && (
        searching ? (
          <section className="space-y-3">
            <p className="text-sm text-slate-500">{results.length ? `${results.length} ${results.length === 1 ? 'orden encontrada' : 'órdenes encontradas'}` : 'Ninguna orden coincide con la búsqueda.'}</p>
            {results.length > 0 && cards(results)}
          </section>
        ) : (
          <>
            {/* Etapas */}
            <nav aria-label="Etapas" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {STAGES.map((s) => {
                const on = stage === s.key;
                const arr = byStage[s.key];
                const n = s.key === 'cerradas' ? arr.filter((o) => isToday(o.updatedAt)).length : arr.length;
                const needs = s.local && arr.some((o) => nextStep(o, process, w).primary);
                return (
                  <button key={s.key} id={`etapa-${s.key}`} onClick={() => { setStage(s.key); syncUrl({ etapa: s.key }); }} aria-current={on ? 'true' : undefined}
                    className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${on ? 'border-[var(--lb)] bg-[var(--lb)] text-[var(--lb-ink)]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                    <s.Icon size={15} />
                    <span className="whitespace-nowrap">{s.key === 'cerradas' ? 'Cerradas hoy' : s.label}</span>
                    <span className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-lg px-1.5 text-xs font-bold ${on ? 'bg-black/15' : needs ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{n}</span>
                  </button>
                );
              })}
            </nav>

            {stage && (
              <section className="space-y-3">
                <p className="text-sm text-slate-500">{stageMeta(stage).hint}</p>
                {visibleList.length === 0 ? (
                  <EmptyState icon={stageMeta(stage).Icon} title={loading ? 'Cargando órdenes…' : `Nada en “${stageMeta(stage).label}”`}
                    text={stage === 'confirmar' ? 'Las solicitudes de retiro que hagan tus clientes desde tu página aparecerán aquí.' : undefined}
                    action={stage === 'confirmar' && !loading ? <Link href="/admin/recepciones" className={btnSecondary}><Plus size={15} /> Recibir una orden en el local</Link> : undefined} />
                ) : cards(visibleList)}
                {stage === 'cerradas' && list.length > visibleList.length && <p className="text-center text-sm text-slate-500">Mostrando las 60 más recientes. Usa la búsqueda para encontrar una orden anterior.</p>}
              </section>
            )}
          </>
        )
      )}

      {view === 'cobros' && (
        <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 p-4">
            <div>
              <h2 className="font-semibold text-slate-900">Por cobrar a clientes</h2>
              <p className="text-sm text-slate-500">El cliente le paga al local. Registra el pago cuando lo recibas.</p>
            </div>
            <p className="text-lg font-bold tabular-nums">{money(porCobrar.reduce((s, o) => s + Number(o.total || 0), 0))}</p>
          </div>
          {porCobrar.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">No hay cobros pendientes.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {porCobrar.map((o) => {
                const st = stageOf(o.estado);
                return (
                  <li key={o.id} className="flex items-center gap-3 p-4">
                    <button onClick={() => setOpenId(o.id)} className="min-w-0 flex-1 text-left">
                      <p className="truncate font-semibold text-slate-900">#{o.numeroPedido} · {o.nombreCliente}</p>
                      <p className="text-sm text-slate-500">{st ? stageMeta(st).label : o.estado} · {isHome(o) ? 'Domicilio' : 'Local'}</p>
                    </button>
                    <span className="font-bold tabular-nums">{money(o.total)}</span>
                    <button onClick={() => run(o, { kind: 'pay', label: 'Cobrar', entregar: false })} className={btnPrimary}><Wallet size={15} /> Registrar pago</button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {view === 'repartidores' && (
        <DeliveriesPanel orders={orders} legs={legs} onPay={payLegs} onOpen={(id) => setOpenId(id)} negocioNombre={negocio?.nombre} lasCosas={w.lasCosas} />
      )}

      {openOrder && (
        <OrderDrawer order={openOrder} process={process} w={w} busy={busy === openOrder.id} onRun={run} onClose={() => setOpenId(null)} />
      )}
      {modalNode}
      {showSettings && (
        <SettingsModal value={tipoArticulo} onClose={() => setShowSettings(false)} onSaved={(t) => { setTipoArticulo(t); setShowSettings(false); notify('Ajustes guardados.'); }} onError={(m) => notify(m, true)} />
      )}
      {toastNode}
    </div>
  );
}
