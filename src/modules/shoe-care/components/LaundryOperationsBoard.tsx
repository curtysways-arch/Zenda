'use client';
/**
 * Panel de operación de lavanderías: todo el flujo de una orden en una sola pantalla.
 *
 *  Por confirmar → Retiro → Por ingresar → En proceso → Listas → Entrega → Entregadas
 *
 * Cada orden muestra SU siguiente acción (confirmar, ingresar, avanzar etapa, pedir repartidor,
 * entregar prendas al repartidor, cobrar). Además:
 *  - Cobros: lo que los clientes le deben al local (el cliente siempre paga al local).
 *  - Repartidores: lo que el local le debe a cada repartidor (un pago por viaje: retiro y entrega).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Inbox, Truck, PackageCheck, Sparkles, CheckCircle2, Store, Search, RefreshCw, ArrowRight,
  ExternalLink, X, Wallet, Bike, Clock, ChevronRight, AlertTriangle, Plus, KeyRound, MapPin, Phone, Settings2, Trash2, Receipt,
} from 'lucide-react';
import { getCanonicalLogistics } from '@/core/logistics/CanonicalLogisticsService';
import { wordsFor, tipoArticuloOf, type LaundryWords } from '@/lib/laundry/wording';

type Order = any;

const money = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;
const parseExtra = (raw: any) => {
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  return raw;
};

/* ── Etapas del flujo ─────────────────────────────────────────────────────── */

type StageKey = 'confirmar' | 'retiro' | 'ingresar' | 'proceso' | 'listas' | 'entrega' | 'cerradas';

const STAGES: { key: StageKey; label: string; short: string; Icon: any; states: string[] }[] = [
  { key: 'confirmar', label: 'Por confirmar', short: 'Confirmar', Icon: Inbox, states: ['SOLICITADA', 'PENDIENTE_RETIRO'] },
  { key: 'retiro', label: 'Retiro en curso', short: 'Retiro', Icon: Truck, states: ['ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO'] },
  {
    key: 'ingresar', label: 'Revisar y cotizar', short: 'Revisar', Icon: Receipt,
    states: ['RECIBIDO', 'RETIRADO', 'INSPECCIONADO', 'CAMBIOS_SOLICITADOS', 'ACEPTADO', 'PRODUCTOS_CONFIRMADOS', 'CAMBIOS_ACEPTADOS'],
  },
  {
    key: 'proceso', label: 'En proceso', short: 'Proceso', Icon: Sparkles,
    states: ['EN_PROCESO', 'EN_LAVADO', 'EN_SECADO', 'EN_ACABADOS', 'LAVANDO', 'SECANDO', 'DETALLADO'],
  },
  { key: 'listas', label: 'Listas', short: 'Listas', Icon: CheckCircle2, states: ['LISTO', 'LISTO_PARA_ENTREGA'] },
  {
    key: 'entrega', label: 'Entrega en curso', short: 'Entrega', Icon: Truck,
    states: ['ESPERANDO_REPARTIDOR_ENTREGA', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR', 'EN_RUTA_ENTREGA', 'ESPERANDO_CLIENTE'],
  },
  { key: 'cerradas', label: 'Entregadas hoy', short: 'Hoy', Icon: CheckCircle2, states: ['ENTREGADO', 'FINALIZADA', 'FINALIZADO', 'COMPLETADO', 'CANCELADO', 'CANCELADA'] },
];
const stageOf = (estado: string): StageKey | null => STAGES.find((s) => s.states.includes(estado))?.key || null;

/** Etapas internas de proceso (configurables en Configuración → procesosLavanderia). */
const DEFAULT_PROCESS = [
  { estado: 'EN_LAVADO', label: 'Lavado' },
  { estado: 'EN_SECADO', label: 'Secado' },
  { estado: 'EN_ACABADOS', label: 'Planchado y acabados' },
];

const isToday = (d?: string | Date | null) => {
  if (!d) return false;
  const x = new Date(d);
  const n = new Date();
  return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth() && x.getDate() === n.getDate();
};

function since(d?: string | Date | null) {
  if (!d) return '';
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 1) return 'ahora';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

function isPaid(o: Order) {
  const ex = parseExtra(o.extraInfo);
  return ex.pagoCliente === 'PAGADO' || ['CONFIRMADO', 'PAGO_VERIFICADO'].includes(String(o.payment?.estado || ''));
}

function driverName(ex: any) {
  return ex.assignedDriverName || ex.assignedDriver || 'El repartidor';
}

/* ── Componente ───────────────────────────────────────────────────────────── */

export default function LaundryOperationsBoard({ negocio }: { negocio: any }) {
  const negocioId: string = negocio?.id;
  const brand: string = negocio?.colorPrimario || '#0e7490';
  const cfg = parseExtra(negocio?.configuracion);
  const PROCESS: { estado: string; label: string }[] =
    Array.isArray(cfg.procesosLavanderia) && cfg.procesosLavanderia.length
      ? cfg.procesosLavanderia
      : DEFAULT_PROCESS;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'operacion' | 'cobros' | 'repartidores'>('operacion');
  const [stage, setStage] = useState<StageKey | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const [payFor, setPayFor] = useState<{ order: Order; entregar: boolean } | null>(null);
  const [cancelFor, setCancelFor] = useState<Order | null>(null);
  const [quoteFor, setQuoteFor] = useState<Order | null>(null);
  const [handoverFor, setHandoverFor] = useState<Order | null>(null);
  const [confirmFor, setConfirmFor] = useState<{ order: Order; title: string; text: string; estado: string; ok: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tipoArticulo, setTipoArticulo] = useState(tipoArticuloOf(negocio));
  const w = useMemo(() => wordsFor({ ...negocio, configuracion: { ...(cfg || {}), tipoArticulo } }), [negocio, tipoArticulo]); // eslint-disable-line react-hooks/exhaustive-deps

  const notify = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    if (!negocioId) return;
    try {
      const res = await fetch(`/api/shoe-care/orders?negocioId=${negocioId}`, { cache: 'no-store' });
      if (res.ok) setOrders(await res.json());
    } finally {
      setLoading(false);
    }
  }, [negocioId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const setEstado = async (o: Order, estado: string, extra: any = {}) => {
    setBusy(o.id);
    try {
      const res = await fetch(`/api/shoe-care/orders/${o.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) notify(data.error || 'No se pudo actualizar la orden.', true);
      await load();
      return res.ok;
    } finally {
      setBusy(null);
    }
  };

  /* ── Derivados ── */
  const open = useMemo(() => orders.filter((o) => {
    const st = stageOf(o.estado);
    if (st === 'cerradas') return isToday(o.updatedAt);
    return st !== null;
  }), [orders]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return open;
    return orders.filter((o) =>
      String(o.numeroPedido).includes(s) ||
      String(o.nombreCliente || '').toLowerCase().includes(s) ||
      String(o.telefonoCliente || '').includes(s)
    );
  }, [open, orders, q]);

  const byStage = useMemo(() => {
    const m: Record<StageKey, Order[]> = { confirmar: [], retiro: [], ingresar: [], proceso: [], listas: [], entrega: [], cerradas: [] };
    for (const o of filtered) {
      const k = stageOf(o.estado);
      if (k) m[k].push(o);
    }
    for (const k of Object.keys(m) as StageKey[]) {
      m[k].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    m.cerradas.reverse();
    return m;
  }, [filtered]);

  // Etapa por defecto: la primera que pide acción del local
  useEffect(() => {
    if (stage || loading) return;
    const first = (['confirmar', 'ingresar', 'listas', 'proceso', 'entrega', 'retiro'] as StageKey[]).find((k) => byStage[k].length > 0);
    setStage(first || 'confirmar');
  }, [byStage, stage, loading]);

  const waitingAtShop = open.filter((o) => o.estado === 'REPARTIDOR_EN_LOCAL');

  // Repartidores: un pago por viaje
  const legs = useMemo(() => {
    const out: { order: Order; tipo: 'RETIRO' | 'ENTREGA'; driverKey: string; driverName: string; phone?: string | null; fee: number; paid: boolean; at: string }[] = [];
    for (const o of orders) {
      if (o.tipoEntrega !== 'DOMICILIO') continue;
      const ex = parseExtra(o.extraInfo);
      const c = getCanonicalLogistics({ ...o, extraInfo: ex, negocio: { tipoNegocio: negocio?.tipoNegocio || 'LAVANDERIA' } });
      const afterPickup = !['SOLICITADA', 'PENDIENTE_RETIRO', 'ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO', 'CANCELADO', 'CANCELADA'].includes(o.estado);
      if (afterPickup && c.pickupDriver) {
        out.push({
          order: o, tipo: 'RETIRO', driverKey: c.pickupDriver.driverId || c.pickupDriver.driverName || '?',
          driverName: c.pickupDriver.driverName || 'Repartidor', phone: c.pickupDriver.driverPhone,
          fee: Number(c.pickupFee || 0), paid: c.pickupDriver.estadoCompensacion === 'PAID',
          at: ex.retiroCompletadoPor?.completedAt || o.updatedAt,
        });
      }
      if (['ENTREGADO', 'FINALIZADA', 'FINALIZADO'].includes(o.estado) && c.deliveryDriver) {
        out.push({
          order: o, tipo: 'ENTREGA', driverKey: c.deliveryDriver.driverId || c.deliveryDriver.driverName || '?',
          driverName: c.deliveryDriver.driverName || 'Repartidor', phone: c.deliveryDriver.driverPhone,
          fee: Number(c.deliveryFee || 0), paid: c.deliveryDriver.estadoCompensacion === 'PAID', at: o.updatedAt,
        });
      }
    }
    return out;
  }, [orders, negocio?.tipoNegocio]);

  const pendingLegs = legs.filter((l) => !l.paid);
  const porPagarRepartidores = pendingLegs.reduce((s, l) => s + l.fee, 0);
  const porCobrar = orders.filter((o) => !isPaid(o) && !['CANCELADO', 'CANCELADA', 'SOLICITADA', 'PENDIENTE_RETIRO'].includes(o.estado));
  const porCobrarTotal = porCobrar.reduce((s, o) => s + Number(o.total || 0), 0);
  const cobradoHoy = orders.filter((o) => isPaid(o) && isToday(parseExtra(o.extraInfo).fechaPago)).reduce((s, o) => s + Number(parseExtra(o.extraInfo).montoPagado || o.total || 0), 0);
  const entregadasHoy = orders.filter((o) => ['ENTREGADO', 'FINALIZADA', 'FINALIZADO'].includes(o.estado) && isToday(o.updatedAt)).length;
  const enCurso = open.filter((o) => !['cerradas'].includes(stageOf(o.estado) || '')).length;

  const payLeg = async (l: (typeof legs)[number]) => {
    const res = await fetch(`/api/shoe-care/orders/${l.order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(l.tipo === 'RETIRO' ? { markPickupPaid: true } : { markDeliveryPaid: true }),
    });
    return res.ok;
  };

  /* ── Render ── */
  return (
    <div className="space-y-5 pb-16">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {negocio?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={negocio.logoUrl} alt="" className="size-12 rounded-2xl object-cover ring-1 ring-slate-200" />
          ) : (
            <span style={{ backgroundColor: brand }} className="size-12 rounded-2xl text-white flex items-center justify-center font-bold text-lg">
              {String(negocio?.nombre || 'L').charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Operación de hoy</p>
            <h1 className="text-2xl font-bold text-slate-900 truncate">{negocio?.nombre || 'Mi lavandería'}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/ordenes-servicio?nueva=recepcion" style={{ backgroundColor: brand }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm">
            <Plus size={16} /> Recibir en el local
          </Link>
          {negocio?.slug && (
            <a href={`/${negocio.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50">
              Mi página <ExternalLink size={14} />
            </a>
          )}
          <button onClick={() => setShowSettings(true)} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-600 text-sm" aria-label="Ajustes del servicio">
            <Settings2 size={15} />
          </button>
          <button onClick={() => { setLoading(true); load(); }} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-600 text-sm" aria-label="Actualizar">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Alertas que no pueden esperar */}
      {(byStage.confirmar.length > 0 || waitingAtShop.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {waitingAtShop.length > 0 && (
            <button onClick={() => { setView('operacion'); setStage('entrega'); }} className="text-left flex items-center gap-3 p-4 rounded-2xl bg-amber-50 ring-1 ring-amber-300">
              <span className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0"><Bike size={18} /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-amber-900">
                  {waitingAtShop.length === 1 ? `${driverName(parseExtra(waitingAtShop[0].extraInfo))} está esperando en el local` : `${waitingAtShop.length} repartidores esperando en el local`}
                </span>
                <span className="block text-sm text-amber-800/80">Pídele su código, entrégale {w.lasCosas} y confírmalo aquí.</span>
              </span>
              <ChevronRight size={18} className="text-amber-500" />
            </button>
          )}
          {byStage.confirmar.length > 0 && (
            <button onClick={() => { setView('operacion'); setStage('confirmar'); }} className="text-left flex items-center gap-3 p-4 rounded-2xl bg-rose-50 ring-1 ring-rose-200">
              <span className="size-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0"><Inbox size={18} /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-rose-900">
                  {byStage.confirmar.length === 1 ? '1 solicitud por confirmar' : `${byStage.confirmar.length} solicitudes por confirmar`}
                </span>
                <span className="block text-sm text-rose-800/80">La más antigua llegó hace {since(byStage.confirmar[0].createdAt)}.</span>
              </span>
              <ChevronRight size={18} className="text-rose-400" />
            </button>
          )}
        </div>
      )}

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Órdenes en curso', value: String(enCurso), sub: `${entregadasHoy} entregadas hoy`, onClick: () => setView('operacion') },
          { label: 'Cobrado hoy', value: money(cobradoHoy), sub: 'Pagos de clientes', onClick: () => setView('cobros') },
          { label: 'Por cobrar a clientes', value: money(porCobrarTotal), sub: `${porCobrar.length} órdenes`, onClick: () => setView('cobros'), warn: porCobrar.length > 0 },
          { label: 'Por pagar a repartidores', value: money(porPagarRepartidores), sub: `${pendingLegs.length} viajes`, onClick: () => setView('repartidores'), warn: pendingLegs.length > 0 },
        ].map((k) => (
          <button key={k.label} onClick={k.onClick} className="text-left bg-white rounded-2xl ring-1 ring-slate-200/80 p-4 hover:ring-slate-300 transition">
            <p className="text-sm text-slate-500">{k.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{k.value}</p>
            <p className={`text-xs mt-0.5 ${k.warn ? 'text-amber-600' : 'text-slate-500'}`}>{k.sub}</p>
          </button>
        ))}
      </div>

      {/* Vistas */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-slate-100 p-1 rounded-xl text-sm">
          {([
            ['operacion', 'Operación'],
            ['cobros', `Cobros${porCobrar.length ? ` (${porCobrar.length})` : ''}`],
            ['repartidores', `Repartidores${pendingLegs.length ? ` (${pendingLegs.length})` : ''}`],
          ] as const).map(([k, label]) => (
            <button key={k} onClick={() => setView(k)} className={`px-3.5 py-1.5 rounded-lg font-medium ${view === k ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
              {label}
            </button>
          ))}
        </div>
        {view === 'operacion' && (
          <label className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por número, cliente o teléfono"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white ring-1 ring-slate-200 text-sm outline-none focus:ring-2"
            />
          </label>
        )}
      </div>

      {view === 'operacion' && (
        <>
          {/* Flujo: etapas con su conteo */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STAGES.map((s, i) => {
              const on = stage === s.key;
              const n = byStage[s.key].length;
              const needsAction = ['confirmar', 'ingresar', 'listas'].includes(s.key) && n > 0;
              return (
                <div key={s.key} className="flex items-center shrink-0">
                  <button
                    onClick={() => setStage(s.key)}
                    style={on ? { backgroundColor: brand, color: '#fff', borderColor: brand } : undefined}
                    className={`flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl border text-sm font-medium transition ${on ? '' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}
                  >
                    <s.Icon size={15} />
                    <span className="whitespace-nowrap">{s.label}</span>
                    <span className={`min-w-[22px] h-[22px] px-1.5 rounded-lg text-xs font-bold flex items-center justify-center ${on ? 'bg-white/25 text-white' : needsAction ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {n}
                    </span>
                  </button>
                  {i < STAGES.length - 1 && <ArrowRight size={14} className="mx-1 text-slate-300 shrink-0" />}
                </div>
              );
            })}
          </div>

          {stage && (
            <StageList
              stage={stage}
              orders={byStage[stage]}
              brand={brand}
              busy={busy}
              process={PROCESS}
              w={w}
              onEstado={setEstado}
              onPay={(o, entregar) => setPayFor({ order: o, entregar })}
              onCancel={(o) => setCancelFor(o)}
              onQuote={(o) => setQuoteFor(o)}
              onHandover={(o) => setHandoverFor(o)}
              onConfirm={(c) => setConfirmFor(c)}
              loading={loading}
            />
          )}
        </>
      )}

      {view === 'cobros' && (
        <section className="bg-white rounded-2xl ring-1 ring-slate-200/80">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Por cobrar a clientes</h2>
            <p className="text-sm text-slate-500">El cliente le paga al local. Registra el pago cuando lo recibas.</p>
          </div>
          {porCobrar.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No hay cobros pendientes.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {porCobrar.map((o) => {
                const st = STAGES.find((s) => s.key === stageOf(o.estado));
                return (
                  <li key={o.id} className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">#{o.numeroPedido} · {o.nombreCliente}</p>
                      <p className="text-sm text-slate-500">{st?.label || o.estado} · {o.tipoEntrega === 'DOMICILIO' ? 'Domicilio' : 'Local'}</p>
                    </div>
                    <span className="font-bold tabular-nums">{money(o.total)}</span>
                    <button onClick={() => setPayFor({ order: o, entregar: false })} style={{ backgroundColor: brand }} className="px-3 py-2 rounded-lg text-white text-sm font-semibold">
                      Registrar pago
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {view === 'repartidores' && (
        <DriverPayouts
          legs={legs}
          brand={brand}
          onPay={async (list) => {
            let ok = 0;
            for (const l of list) if (await payLeg(l)) ok++;
            notify(ok === list.length ? `Marcado como pagado (${ok} ${ok === 1 ? 'viaje' : 'viajes'}).` : 'Algunos viajes no se pudieron marcar.', ok !== list.length);
            load();
          }}
        />
      )}

      {/* Registrar pago */}
      {payFor && (
        <PayModal
          order={payFor.order}
          entregar={payFor.entregar}
          brand={brand}
          onClose={() => setPayFor(null)}
          onDone={(msg) => { setPayFor(null); notify(msg); load(); }}
          onError={(m) => notify(m, true)}
        />
      )}

      {/* Cancelar / rechazar */}
      {cancelFor && (
        <CancelModal
          order={cancelFor}
          onClose={() => setCancelFor(null)}
          onConfirm={async (motivo) => {
            const ok = await setEstado(cancelFor, 'CANCELADO', { motivo });
            if (ok) notify('Orden cancelada. Le avisamos al cliente.');
            setCancelFor(null);
          }}
        />
      )}

      {quoteFor && (
        <QuoteModal
          order={quoteFor}
          negocioId={negocioId}
          brand={brand}
          w={w}
          firstProcess={PROCESS[0]}
          onClose={() => setQuoteFor(null)}
          onDone={(msg) => { setQuoteFor(null); notify(msg); load(); }}
          onError={(m) => notify(m, true)}
        />
      )}

      {handoverFor && (
        <HandoverModal
          order={handoverFor}
          brand={brand}
          w={w}
          onClose={() => setHandoverFor(null)}
          onSubmit={async (codigo) => {
            const ok = await setEstado(handoverFor, 'ENTREGADO_A_REPARTIDOR', { codigo });
            if (ok) { setHandoverFor(null); notify('Listo: el repartidor ya puede salir a entregar.'); }
          }}
        />
      )}

      {confirmFor && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setConfirmFor(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">{confirmFor.title}</h3>
            <p className="text-sm text-slate-600">{confirmFor.text}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setConfirmFor(null)} className="flex-1 py-3 rounded-xl ring-1 ring-slate-200 font-medium">Volver</button>
              <button
                onClick={async () => { const c = confirmFor; setConfirmFor(null); const ok = await setEstado(c.order, c.estado); if (ok) notify('Guardado.'); }}
                style={{ backgroundColor: brand }}
                className="flex-1 py-3 rounded-xl text-white font-semibold"
              >
                {confirmFor.ok}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          brand={brand}
          value={tipoArticulo}
          onClose={() => setShowSettings(false)}
          onSaved={(t) => { setTipoArticulo(t); setShowSettings(false); notify('Ajustes guardados.'); }}
          onError={(m) => notify(m, true)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${toast.err ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ── Lista de órdenes de una etapa ───────────────────────────────────────── */

type CardActions = {
  brand: string;
  busy: string | null;
  process: { estado: string; label: string }[];
  w: LaundryWords;
  onEstado: (o: Order, estado: string, extra?: any) => Promise<boolean>;
  onPay: (o: Order, entregar: boolean) => void;
  onCancel: (o: Order) => void;
  onQuote: (o: Order) => void;
  onHandover: (o: Order) => void;
  onConfirm: (c: { order: Order; title: string; text: string; estado: string; ok: string }) => void;
};

function StageList(props: CardActions & { stage: StageKey; orders: Order[]; loading: boolean }) {
  const { stage, orders, brand } = props;
  const meta = STAGES.find((s) => s.key === stage)!;
  const hints: Record<StageKey, string> = {
    confirmar: 'Revisa la solicitud y confírmala. El cliente recibe su código de retiro y la orden pasa a los repartidores.',
    retiro: `Un repartidor va por ${props.w.lasCosas}. Al entregárselos, el cliente ingresa en su teléfono el código del repartidor.`,
    ingresar: `Revisa ${props.w.lasCosas} y fija el precio final. Si sube del estimado, el cliente lo aprueba antes de empezar.`,
    proceso: 'Avanza cada orden por sus etapas. Al terminar, márcala como lista.',
    listas: 'A domicilio: pide un repartidor de entrega. En el local: entrega y cobra.',
    entrega: `Cuando el repartidor llegue, pídele su código y entrégale ${props.w.lasCosas}. Él cierra la entrega con el código del cliente.`,
    cerradas: 'Órdenes entregadas o canceladas hoy.',
  };

  return (
    <section className="space-y-3">
      <p className="text-sm text-slate-500">{hints[stage]}</p>
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-10 text-center">
          <meta.Icon className="size-8 text-slate-300 mx-auto" />
          <p className="font-medium text-slate-700 mt-2">{props.loading ? 'Cargando…' : `Nada en “${meta.label}”`}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {orders.map((o) => (
            <OrderCard key={o.id} {...props} order={o} />
          ))}
        </div>
      )}
    </section>
  );
}

function OrderCard(props: CardActions & { order: Order }) {
  const { order: o, brand, process, w } = props;
  const ex = parseExtra(o.extraInfo);
  const st = o.estado;
  const domicilio = o.tipoEntrega === 'DOMICILIO';
  const paid = isPaid(o);
  const busy = props.busy === o.id;
  const items: any[] = Array.isArray(o.items) && o.items.length ? o.items : [];
  const articulos = items.length
    ? items.map((it: any) => `${Number(it.cantidad)}× ${it.nombreProducto}`).join(', ')
    : ex.servicioNombre || 'Servicio';
  const dName = driverName(ex);

  // Línea de estado y acción principal según el paso
  let status = '';
  let tone: 'neutral' | 'warn' | 'ok' | 'info' = 'neutral';
  let primary: { label: string; run: () => void } | null = null;
  let secondary: { label: string; run: () => void } | null = null;

  const procIdx = process.findIndex((p) => p.estado === st);
  switch (st) {
    case 'SOLICITADA':
    case 'PENDIENTE_RETIRO':
      status = `Pidió retiro ${ex.fechaHoraRetiro ? `· ${ex.fechaHoraRetiro}` : ''}`;
      tone = 'warn';
      primary = { label: 'Confirmar', run: () => props.onEstado(o, 'ESPERANDO_REPARTIDOR_RETIRO') };
      secondary = { label: 'Rechazar', run: () => props.onCancel(o) };
      break;
    case 'ESPERANDO_REPARTIDOR_RETIRO':
    case 'ESPERANDO_ACEPTACION_REPARTIDOR':
      status = 'Buscando repartidor para el retiro';
      secondary = { label: 'Cancelar', run: () => props.onCancel(o) };
      break;
    case 'REPARTIDOR_EN_CAMINO':
      status = `${dName} va donde el cliente. El cliente confirma el retiro con el código del repartidor.`;
      tone = 'info';
      secondary = {
        label: 'Confirmar retiro',
        run: () => props.onConfirm({
          order: o,
          title: `Confirmar retiro #${o.numeroPedido}`,
          text: `Úsalo solo si el cliente no pudo ingresar el código y confirmaste por teléfono que ya entregó ${w.tusCosas.replace('tus ', 'sus ')}. Quedará registrado a tu nombre.`,
          estado: 'RECOGIDO',
          ok: 'Sí, ya retiró',
        }),
      };
      break;
    case 'RECOGIDO':
      status = `${dName} trae ${w.lasCosas} al local`;
      tone = 'info';
      break;
    case 'RECIBIDO':
    case 'RETIRADO':
      status = domicilio ? `Llegó al local · estimado ${money(ex.cotizacion?.estimado ?? o.subtotal)}` : 'Recibida en el local';
      tone = 'warn';
      primary = { label: 'Revisar y fijar precio', run: () => props.onQuote(o) };
      break;
    case 'CAMBIOS_SOLICITADOS':
      status = `Esperando que el cliente apruebe ${money(o.subtotal)} (estimado ${money(ex.cotizacion?.estimado)})`;
      tone = 'warn';
      primary = {
        label: 'Aprobó por teléfono',
        run: () => props.onConfirm({
          order: o,
          title: `¿El cliente aprobó ${money(o.total)}?`,
          text: 'Usa esto si el cliente te confirmó por teléfono o en persona. Quedará registrado.',
          estado: 'ACEPTADO',
          ok: 'Sí, aprobó',
        }),
      };
      secondary = { label: 'Cambiar precio', run: () => props.onQuote(o) };
      break;
    case 'ACEPTADO':
    case 'INSPECCIONADO':
    case 'PRODUCTOS_CONFIRMADOS':
    case 'CAMBIOS_ACEPTADOS':
      status = `Precio aprobado: ${money(o.subtotal)}`;
      tone = 'ok';
      primary = { label: `Empezar ${process[0]?.label.toLowerCase() || 'proceso'}`, run: () => props.onEstado(o, process[0]?.estado || 'EN_PROCESO') };
      break;
    case 'LISTO':
    case 'LISTO_PARA_ENTREGA':
      status = ex.devolverSinServicio
        ? 'El cliente no aceptó el precio: devolver sin procesar (solo cobra el envío)'
        : domicilio ? 'Lista para enviar' : 'Lista para retirar en el local';
      tone = ex.devolverSinServicio ? 'warn' : 'ok';
      primary = domicilio
        ? { label: 'Pedir repartidor de entrega', run: () => props.onEstado(o, 'ESPERANDO_REPARTIDOR_ENTREGA') }
        : paid
          ? { label: 'Entregar al cliente', run: () => props.onEstado(o, 'ENTREGADO') }
          : { label: 'Cobrar y entregar', run: () => props.onPay(o, true) };
      break;
    case 'ESPERANDO_REPARTIDOR_ENTREGA':
      status = 'Buscando repartidor para la entrega';
      break;
    case 'REPARTIDOR_ASIGNADO':
      status = `${dName} viene al local`;
      tone = 'info';
      break;
    case 'REPARTIDOR_EN_LOCAL':
      status = `${dName} está en el local`;
      tone = 'warn';
      primary = { label: `Entregar a ${dName.split(' ')[0]}`, run: () => props.onHandover(o) };
      break;
    case 'ENTREGADO_A_REPARTIDOR':
    case 'EN_RUTA_ENTREGA':
      status = `${dName} va donde el cliente`;
      tone = 'info';
      break;
    case 'ESPERANDO_CLIENTE':
      status = `${dName} llegó donde el cliente`;
      tone = 'info';
      break;
    case 'ENTREGADO':
    case 'FINALIZADA':
    case 'FINALIZADO':
      status = 'Entregada';
      tone = 'ok';
      break;
    case 'CANCELADO':
    case 'CANCELADA':
      status = ex.motivoCancelacion ? `Cancelada: ${ex.motivoCancelacion}` : 'Cancelada';
      break;
    default: {
      // Etapas de proceso
      if (procIdx >= 0) {
        status = process[procIdx].label;
        tone = 'info';
        const next = process[procIdx + 1];
        primary = next
          ? { label: `Pasar a ${next.label.toLowerCase()}`, run: () => props.onEstado(o, next.estado) }
          : { label: 'Marcar como lista', run: () => props.onEstado(o, 'LISTO') };
      } else {
        status = 'En proceso';
        tone = 'info';
        primary = { label: `Pasar a ${process[0]?.label.toLowerCase() || 'proceso'}`, run: () => props.onEstado(o, process[0]?.estado || 'EN_PROCESO') };
      }
    }
  }

  const toneCls = { neutral: 'text-slate-600', warn: 'text-amber-700', ok: 'text-emerald-700', info: 'text-sky-700' }[tone];
  const inProcess = procIdx >= 0;

  return (
    <article className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">#{o.numeroPedido}</span>
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${domicilio ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
              {domicilio ? 'Domicilio' : 'Local'}
            </span>
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {paid ? 'Pagado' : 'Por cobrar'}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-800 truncate mt-0.5">{o.nombreCliente}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold tabular-nums">{money(o.total)}</p>
          <p className="text-xs text-slate-400 flex items-center gap-1 justify-end"><Clock size={11} /> {since(ex.stateUpdatedAt || o.updatedAt)}</p>
        </div>
      </div>

      <p className="text-sm text-slate-600 line-clamp-2">{articulos}</p>

      {domicilio && ['confirmar', 'retiro'].includes(stageOf(st) || '') && o.direccionCliente && (
        <p className="text-xs text-slate-500 flex gap-1.5"><MapPin size={13} className="shrink-0 mt-0.5" /> <span className="line-clamp-2">{o.direccionCliente}</span></p>
      )}

      {inProcess && (
        <div className="flex gap-1">
          {process.map((p, i) => (
            <span key={p.estado} style={i <= procIdx ? { backgroundColor: brand } : undefined} className={`h-1.5 flex-1 rounded-full ${i <= procIdx ? '' : 'bg-slate-200'}`} title={p.label} />
          ))}
        </div>
      )}

      <p className={`text-sm font-medium ${toneCls}`}>{status}</p>

      <div className="flex items-center gap-2 mt-auto">
        {primary && (
          <button
            disabled={busy}
            onClick={primary.run}
            style={{ backgroundColor: brand }}
            className="flex-1 px-3 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {busy ? <RefreshCw size={15} className="animate-spin" /> : null} {primary.label}
          </button>
        )}
        {!paid && !['CANCELADO', 'CANCELADA', 'SOLICITADA', 'PENDIENTE_RETIRO'].includes(st) && !(primary?.label === 'Cobrar y entregar') && (
          <button onClick={() => props.onPay(o, false)} className="px-3 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <Wallet size={14} /> Cobrar
          </button>
        )}
        {secondary && (
          <button onClick={secondary.run} className="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-rose-600">
            {secondary.label}
          </button>
        )}
        <Link href={`/admin/service-orders/${o.id}`} className="px-2.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-700" aria-label="Ver detalle">
          <ChevronRight size={18} />
        </Link>
      </div>
    </article>
  );
}

/* ── Pagos a repartidores ────────────────────────────────────────────────── */

function DriverPayouts({ legs, brand, onPay }: { legs: any[]; brand: string; onPay: (list: any[]) => Promise<void> }) {
  const [paying, setPaying] = useState<string | null>(null);
  const groups = useMemo(() => {
    const m: Record<string, { name: string; phone?: string | null; pending: any[]; paidTotal: number }> = {};
    for (const l of legs) {
      m[l.driverKey] = m[l.driverKey] || { name: l.driverName, phone: l.phone, pending: [], paidTotal: 0 };
      if (l.paid) m[l.driverKey].paidTotal += l.fee;
      else m[l.driverKey].pending.push(l);
    }
    return Object.entries(m).sort((a, b) => b[1].pending.length - a[1].pending.length);
  }, [legs]);

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-10 text-center">
        <Bike className="size-8 text-slate-300 mx-auto" />
        <p className="font-medium text-slate-700 mt-2">Aún no hay viajes de repartidores</p>
        <p className="text-sm text-slate-500">Cada retiro y cada entrega a domicilio se paga por separado al repartidor que la hizo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        El envío que paga el cliente cubre 2 viajes: cada repartidor recibe la tarifa de su viaje (retiro o entrega). Le pagas tú directamente.
      </p>
      {groups.map(([key, g]) => {
        const total = g.pending.reduce((s: number, l: any) => s + l.fee, 0);
        return (
          <section key={key} className="bg-white rounded-2xl ring-1 ring-slate-200/80">
            <div className="p-4 flex items-center gap-3 border-b border-slate-100">
              <span className="size-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><Bike size={18} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{g.name}</p>
                <p className="text-xs text-slate-500">
                  {g.pending.length ? `${g.pending.length} ${g.pending.length === 1 ? 'viaje' : 'viajes'} por pagar` : 'Al día'} · pagado {money(g.paidTotal)}
                </p>
              </div>
              {g.phone && (
                <a href={`tel:${g.phone}`} className="p-2 rounded-lg text-slate-400 hover:text-slate-700" aria-label="Llamar"><Phone size={16} /></a>
              )}
              {g.pending.length > 0 && (
                <button
                  disabled={paying === key}
                  onClick={async () => { setPaying(key); await onPay(g.pending); setPaying(null); }}
                  style={{ backgroundColor: brand }}
                  className="px-3 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                >
                  Pagar {money(total)}
                </button>
              )}
            </div>
            {g.pending.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {g.pending.map((l: any) => (
                  <li key={`${l.order.id}-${l.tipo}`} className="px-4 py-2.5 flex items-center justify-between text-sm">
                    <span className="text-slate-700">
                      <span className={`inline-block w-16 text-xs font-semibold ${l.tipo === 'RETIRO' ? 'text-sky-700' : 'text-violet-700'}`}>{l.tipo === 'RETIRO' ? 'Retiro' : 'Entrega'}</span>
                      #{l.order.numeroPedido} · {l.order.nombreCliente}
                    </span>
                    <span className="font-medium tabular-nums">{money(l.fee)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ── Modales ─────────────────────────────────────────────────────────────── */

function PayModal({ order, entregar, brand, onClose, onDone, onError }: {
  order: Order; entregar: boolean; brand: string; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void;
}) {
  const [metodo, setMetodo] = useState('EFECTIVO');
  const [monto, setMonto] = useState(String(Number(order.total || 0).toFixed(2)));
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/shoe-care/orders/${order.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metodoPago: metodo, monto: Number(monto), entregar }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return onError(data.error || 'No se pudo registrar el pago.');
      onDone(entregar ? 'Pago registrado y orden entregada.' : 'Pago registrado.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{entregar ? 'Cobrar y entregar' : 'Registrar pago'} · #{order.numeroPedido}</h3>
          <button onClick={onClose} className="p-1 text-slate-400" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-500">{order.nombreCliente}</p>
        <div className="grid grid-cols-3 gap-2">
          {['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'].map((m) => (
            <button
              key={m}
              onClick={() => setMetodo(m)}
              style={metodo === m ? { borderColor: brand, color: brand, backgroundColor: `${brand}0D` } : undefined}
              className={`py-2 rounded-xl border-2 text-sm font-medium ${metodo === m ? '' : 'border-slate-200 text-slate-600'}`}
            >
              {m.charAt(0) + m.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="text-sm text-slate-600">Monto recibido</span>
          <input value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="mt-1 w-full px-3 py-2.5 rounded-xl ring-1 ring-slate-200 text-lg font-semibold outline-none focus:ring-2" />
        </label>
        <button disabled={saving} onClick={submit} style={{ backgroundColor: brand }} className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60">
          {saving ? 'Guardando…' : 'Confirmar pago'}
        </button>
      </div>
    </div>
  );
}

function CancelModal({ order, onClose, onConfirm }: { order: Order; onClose: () => void; onConfirm: (motivo: string) => void }) {
  const [motivo, setMotivo] = useState('');
  const reasons = ['Fuera de nuestra zona', 'No hay cupo hoy', 'Servicio no disponible', 'El cliente lo pidió'];
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2"><AlertTriangle size={18} className="text-rose-500" /> Cancelar #{order.numeroPedido}</h3>
          <button onClick={onClose} className="p-1 text-slate-400" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {reasons.map((r) => (
            <button key={r} onClick={() => setMotivo(r)} className={`px-3 py-1.5 rounded-full text-sm border ${motivo === r ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600'}`}>{r}</button>
          ))}
        </div>
        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (lo verá el cliente)" rows={2} className="w-full px-3 py-2 rounded-xl ring-1 ring-slate-200 text-sm outline-none focus:ring-2" />
        <button onClick={() => onConfirm(motivo.trim())} className="w-full py-3 rounded-xl bg-rose-600 text-white font-semibold">Cancelar orden</button>
      </div>
    </div>
  );
}

/* ── Revisar y fijar precio final ────────────────────────────────────────── */

type QLine = { nombreProducto: string; cantidad: number; precioUnitario: number; base: number; nivel: string | null };

function QuoteModal({ order, negocioId, brand, w, firstProcess, onClose, onDone, onError }: {
  order: Order; negocioId: string; brand: string; w: LaundryWords; firstProcess?: { estado: string; label: string };
  onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void;
}) {
  const ex = parseExtra(order.extraInfo);
  const estimado = Number(ex.cotizacion?.estimado ?? order.subtotal ?? 0);
  const [lines, setLines] = useState<QLine[]>(() =>
    (order.items || []).map((it: any) => {
      const p = Number(it.precioUnitario) || 0;
      return { nombreProducto: String(it.nombreProducto || '').replace(/ · [^·]+$/, ''), cantidad: Number(it.cantidad) || 1, precioUnitario: p, base: p, nivel: null };
    })
  );
  const [levels, setLevels] = useState<{ label: string; price: number }[]>([]);
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/shoe-care/settings?negocioId=${negocioId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!s) return;
        const l = [
          { label: 'Poco sucio', price: Number(s.precioPocoSucio) },
          { label: 'Sucio', price: Number(s.precioMedioSucio) },
          { label: 'Muy sucio', price: Number(s.precioMuySucio) },
          { label: 'Restauración', price: Number(s.precioRestauracion) },
        ].filter((x) => x.price > 0);
        setLevels(l);
      })
      .catch(() => {});
  }, [negocioId]);

  const final = Math.round(lines.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0) * 100) / 100;
  const diff = Math.round((final - estimado) * 100) / 100;
  const set = (i: number, patch: Partial<QLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/shoe-care/orders/${order.id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({ nombreProducto: l.nombreProducto, cantidad: l.cantidad, precioUnitario: l.precioUnitario, nivel: l.nivel })),
          nota: nota.trim() || null,
          siguienteEstado: firstProcess?.estado || 'EN_PROCESO',
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return onError(d.error || 'No se pudo guardar el precio.');
      onDone(d.requiereAprobacion ? 'Le enviamos el nuevo precio al cliente para que lo apruebe.' : `Precio confirmado. La orden pasó a ${firstProcess?.label.toLowerCase() || 'proceso'}.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg">Precio final · #{order.numeroPedido}</h3>
            <p className="text-sm text-slate-500">Revisa {w.lasCosas} y ajusta cada línea según su estado. El cliente vio un estimado de {money(estimado)}.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400" aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="rounded-2xl ring-1 ring-slate-200 p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  value={l.nombreProducto}
                  onChange={(e) => set(i, { nombreProducto: e.target.value })}
                  className="flex-1 min-w-0 px-2.5 py-2 rounded-lg ring-1 ring-slate-200 text-sm outline-none focus:ring-2"
                />
                <button onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="p-2 text-slate-400 hover:text-rose-600" aria-label="Quitar línea"><Trash2 size={16} /></button>
              </div>
              {levels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {l.base > 0 && (
                    <button
                      onClick={() => set(i, { precioUnitario: l.base, nivel: null })}
                      className={`px-2.5 py-1 rounded-full text-xs border ${l.nivel === null && l.precioUnitario === l.base ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600'}`}
                    >
                      Como pidió {money(l.base)}
                    </button>
                  )}
                  {levels.map((lv) => (
                    <button
                      key={lv.label}
                      onClick={() => set(i, { precioUnitario: lv.price, nivel: lv.label })}
                      style={l.nivel === lv.label ? { backgroundColor: brand, borderColor: brand, color: '#fff' } : undefined}
                      className={`px-2.5 py-1 rounded-full text-xs border ${l.nivel === lv.label ? '' : 'border-slate-200 text-slate-600'}`}
                    >
                      {lv.label} {money(lv.price)}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-1.5 text-slate-500">
                  Cant.
                  <input type="number" min={1} value={l.cantidad} onChange={(e) => set(i, { cantidad: Math.max(1, Number(e.target.value) || 1) })} className="w-16 px-2 py-1.5 rounded-lg ring-1 ring-slate-200 outline-none focus:ring-2" />
                </label>
                <label className="flex items-center gap-1.5 text-slate-500">
                  $ c/u
                  <input
                    inputMode="decimal"
                    value={String(l.precioUnitario)}
                    onChange={(e) => set(i, { precioUnitario: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })}
                    className="w-20 px-2 py-1.5 rounded-lg ring-1 ring-slate-200 outline-none focus:ring-2"
                  />
                </label>
                <span className="ml-auto font-semibold tabular-nums">{money(l.cantidad * l.precioUnitario)}</span>
              </div>
            </div>
          ))}
          <button
            onClick={() => setLines((ls) => [...ls, { nombreProducto: 'Extra', cantidad: 1, precioUnitario: 0, base: 0, nivel: null }])}
            className="text-sm font-semibold flex items-center gap-1"
            style={{ color: brand }}
          >
            <Plus size={15} /> Agregar línea (extra, reparación…)
          </button>
        </div>

        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          placeholder="Motivo para el cliente (ej.: manchas de grasa, suela despegada)"
          className="w-full px-3 py-2 rounded-xl ring-1 ring-slate-200 text-sm outline-none focus:ring-2"
        />

        <div className={`rounded-2xl p-3 text-sm ${diff > 0.009 ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>
          <div className="flex justify-between"><span>Estimado</span><span className="tabular-nums">{money(estimado)}</span></div>
          <div className="flex justify-between font-semibold"><span>Precio final</span><span className="tabular-nums">{money(final)}</span></div>
          <p className="mt-1.5 text-xs">
            {diff > 0.009
              ? `Sube ${money(diff)}: le enviaremos el nuevo precio al cliente y esperaremos su aprobación antes de empezar. Si no acepta, se le devuelve sin procesar y paga solo el envío.`
              : `Igual o menor al estimado: la orden pasa directo a ${firstProcess?.label.toLowerCase() || 'proceso'} y avisamos al cliente.`}
          </p>
        </div>

        <button disabled={saving || !lines.length} onClick={submit} style={{ backgroundColor: brand }} className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60">
          {saving ? 'Guardando…' : diff > 0.009 ? 'Enviar precio al cliente' : 'Confirmar y empezar'}
        </button>
      </div>
    </div>
  );
}

/* ── Entregar al repartidor con su código ───────────────────────────────── */

function HandoverModal({ order, brand, w, onClose, onSubmit }: {
  order: Order; brand: string; w: LaundryWords; onClose: () => void; onSubmit: (codigo: string) => Promise<void>;
}) {
  const ex = parseExtra(order.extraInfo);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2"><KeyRound size={18} style={{ color: brand }} /> Entregar #{order.numeroPedido}</h3>
          <button onClick={onClose} className="p-1 text-slate-400" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-600">
          Pídele a {driverName(ex)} el código que aparece en su app y escríbelo. Así confirmas que le entregas {w.lasCosas} al repartidor correcto.
        </p>
        <input
          autoFocus
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="····"
          className="w-full text-center text-3xl font-bold tracking-[0.6em] pl-[0.6em] py-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 outline-none focus:ring-2"
        />
        <button
          disabled={code.length !== 4 || saving}
          onClick={async () => { setSaving(true); await onSubmit(code); setSaving(false); }}
          style={{ backgroundColor: brand }}
          className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
        >
          {saving ? 'Verificando…' : `Entregar ${w.lasCosas}`}
        </button>
      </div>
    </div>
  );
}

/* ── Ajustes del servicio ────────────────────────────────────────────────── */

function SettingsModal({ brand, value, onClose, onSaved, onError }: {
  brand: string; value: 'ZAPATOS' | 'ROPA' | 'AMBOS'; onClose: () => void; onSaved: (t: 'ZAPATOS' | 'ROPA' | 'AMBOS') => void; onError: (m: string) => void;
}) {
  const [t, setT] = useState(value);
  const [saving, setSaving] = useState(false);
  const opts: { k: 'ZAPATOS' | 'ROPA' | 'AMBOS'; label: string; sub: string }[] = [
    { k: 'ZAPATOS', label: 'Zapatos', sub: 'Lavado y cuidado de calzado' },
    { k: 'ROPA', label: 'Ropa', sub: 'Lavandería de prendas' },
    { k: 'AMBOS', label: 'Zapatos y ropa', sub: 'Ofreces los dos servicios' },
  ];
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">¿Qué lavas?</h3>
          <button onClick={onClose} className="p-1 text-slate-400" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-500">Cambia los textos de tu página, los mensajes al cliente y la app del repartidor.</p>
        <div className="space-y-2">
          {opts.map((o) => (
            <button
              key={o.k}
              onClick={() => setT(o.k)}
              style={t === o.k ? { borderColor: brand, backgroundColor: `${brand}0D` } : undefined}
              className={`w-full text-left p-3 rounded-xl border-2 ${t === o.k ? '' : 'border-slate-200'}`}
            >
              <span className="block font-semibold">{o.label}</span>
              <span className="block text-sm text-slate-500">{o.sub}</span>
            </button>
          ))}
        </div>
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              const r = await fetch('/api/shoe-care/service-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipoArticulo: t }) });
              const d = await r.json().catch(() => ({}));
              if (!r.ok) return onError(d.error || 'No se pudo guardar.');
              onSaved(t);
            } finally {
              setSaving(false);
            }
          }}
          style={{ backgroundColor: brand }}
          className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
