'use client';
/**
 * Piezas compartidas del admin de lavandería: carga de órdenes, acciones (cobrar, cancelar,
 * fijar precio, entregar al repartidor), modales, tarjeta de orden y panel de detalle.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  X, Wallet, KeyRound, AlertTriangle, Plus, Trash2, Phone, MapPin, MessageCircle, ExternalLink, Clock,
  Loader2, ChevronRight, Bike, Camera, FileText,
} from 'lucide-react';
import type { LaundryWords } from '@/lib/laundry/wording';
import {
  Order, Action, money, parseExtra, nextStep, isPaid, isHome, itemsSummary, since, driverName,
  stageOf, stageMeta, TONE_TEXT, TONE_DOT, readableState, isCancelled,
} from './flow';

type Proc = { estado: string; label: string }[];

/* ── Estilos base ───────────────────────────────────────────────────────── */

export function inkFor(hex: string) {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(hex || '').trim());
  if (!m) return '#ffffff';
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#0f172a' : '#ffffff';
}

export function brandVars(brand: string) {
  return { ['--lb' as any]: brand, ['--lb-ink' as any]: inkFor(brand) } as React.CSSProperties;
}

export const btnPrimary = 'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[var(--lb)] px-3.5 py-2.5 text-sm font-semibold text-[var(--lb-ink)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb)]';
export const btnSecondary = 'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60';
export const btnGhost = 'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60';
const fieldCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-[var(--lb)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--lb)_15%,transparent)]';

/** Hoja inferior en celular, ventana centrada en computadora. */
export function Sheet({ title, subtitle, onClose, children, wide, footer }: {
  title: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean; footer?: React.ReactNode;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-lg' : 'sm:max-w-sm'}`}>
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="-mr-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2">{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const notify = useCallback((msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), err ? 5000 : 3200);
  }, []);
  const node = toast && (
    <div role="status" className={`fixed bottom-24 left-1/2 z-[130] max-w-[90vw] -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg md:bottom-6 ${toast.err ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>
      {toast.msg}
    </div>
  );
  return { notify, toastNode: node };
}

/* ── Datos ──────────────────────────────────────────────────────────────── */

export function useLaundryOrders(negocioId?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!negocioId) return;
    try {
      const res = await fetch(`/api/shoe-care/orders?negocioId=${negocioId}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar las órdenes.');
      setOrders(Array.isArray(data) ? data : []);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [negocioId]);

  useEffect(() => {
    reload();
    const t = setInterval(reload, 20000);
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [reload]);

  return { orders, loading, error, reload, setLoading };
}

/* ── Acciones ───────────────────────────────────────────────────────────── */

/**
 * Ejecuta la acción de una orden. Las que necesitan datos (cobro, precio, código, motivo,
 * confirmación) abren su ventana; las demás cambian el estado directo.
 */
export function useLaundryActions(opts: {
  negocioId: string; brand: string; w: LaundryWords; process: Proc; reload: () => Promise<void> | void; notify: (m: string, err?: boolean) => void;
}) {
  const { negocioId, brand, w, process, reload, notify } = opts;
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState<{ order: Order; action: Action } | null>(null);

  const setEstado = useCallback(async (o: Order, estado: string, extra: any = {}) => {
    setBusy(o.id);
    try {
      const res = await fetch(`/api/shoe-care/orders/${o.id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) notify(data.error || 'No se pudo actualizar la orden.', true);
      await reload();
      return res.ok;
    } catch {
      notify('Sin conexión. Intenta de nuevo.', true);
      return false;
    } finally {
      setBusy(null);
    }
  }, [notify, reload]);

  const run = useCallback(async (o: Order, a: Action) => {
    if (a.kind === 'estado') {
      const ok = await setEstado(o, a.estado);
      if (ok) notify(`#${o.numeroPedido}: ${readableState(a.estado).toLowerCase()}.`);
      return;
    }
    setModal({ order: o, action: a });
  }, [setEstado, notify]);

  const close = () => setModal(null);
  const done = (msg: string) => { setModal(null); notify(msg); reload(); };

  let node: React.ReactNode = null;
  if (modal) {
    const { order, action } = modal;
    if (action.kind === 'pay') node = <PayModal order={order} entregar={action.entregar} onClose={close} onDone={done} onError={(m) => notify(m, true)} />;
    if (action.kind === 'cancel') node = (
      <CancelModal order={order} onClose={close} onConfirm={async (motivo) => {
        const ok = await setEstado(order, 'CANCELADO', { motivo });
        setModal(null);
        if (ok) notify('Orden cancelada. Le avisamos al cliente.');
      }} />
    );
    if (action.kind === 'quote') node = <QuoteModal order={order} negocioId={negocioId} brand={brand} w={w} firstProcess={process[0]} onClose={close} onDone={done} onError={(m) => notify(m, true)} />;
    if (action.kind === 'handover') node = (
      <HandoverModal order={order} w={w} onClose={close} onSubmit={async (codigo) => {
        const ok = await setEstado(order, 'ENTREGADO_A_REPARTIDOR', { codigo });
        if (ok) { setModal(null); notify('Listo: el repartidor ya puede salir a entregar.'); }
      }} />
    );
    if (action.kind === 'confirm') node = (
      <Sheet title={action.title} onClose={close} footer={
        <div className="flex gap-2">
          <button onClick={close} className={`${btnSecondary} flex-1`}>Volver</button>
          <button onClick={async () => { setModal(null); const ok = await setEstado(order, action.estado); if (ok) notify('Guardado.'); }} className={`${btnPrimary} flex-1`}>{action.ok}</button>
        </div>
      }>
        <p className="text-sm leading-relaxed text-slate-600">{action.text}</p>
      </Sheet>
    );
  }

  return { run, busy, setEstado, modalNode: node };
}

/* ── Tarjeta de orden ───────────────────────────────────────────────────── */

export function OrderCard({ order: o, process, w, busy, onRun, onOpen, compact }: {
  order: Order; process: Proc; w: LaundryWords; busy: boolean; onRun: (o: Order, a: Action) => void; onOpen: (o: Order) => void; compact?: boolean;
}) {
  const ex = parseExtra(o.extraInfo);
  const step = nextStep(o, process, w);
  const paid = isPaid(o);
  const home = isHome(o);
  const stage = stageOf(o.estado);
  const showPay = !paid && !isCancelled(o) && !['confirmar'].includes(stage || '') && step.primary?.kind !== 'pay' && stage !== 'cerradas';

  return (
    <article className="group flex flex-col rounded-2xl bg-white ring-1 ring-slate-200/80 transition hover:ring-slate-300">
      <button type="button" onClick={() => onOpen(o)} className="flex flex-col gap-2 p-4 pb-3 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm">
              <span className="font-bold text-slate-900">#{o.numeroPedido}</span>
              <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${home ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>{home ? 'Domicilio' : 'Local'}</span>
              {!isCancelled(o) && (
                <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{paid ? 'Pagada' : 'Por cobrar'}</span>
              )}
            </p>
            <p className="mt-1 truncate font-semibold text-slate-900">{o.nombreCliente || 'Cliente'}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-bold tabular-nums text-slate-900">{money(o.total)}</p>
            <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-slate-400"><Clock size={11} /> {since(ex.stateUpdatedAt || o.updatedAt)}</p>
          </div>
        </div>
        {!compact && <p className="line-clamp-2 text-sm text-slate-600">{itemsSummary(o)}</p>}
        {step.processIndex >= 0 && (
          <div className="flex gap-1" aria-label={`Etapa ${step.processIndex + 1} de ${process.length}`}>
            {process.map((p, i) => <span key={p.estado} title={p.label} className={`h-1.5 flex-1 rounded-full ${i <= step.processIndex ? 'bg-[var(--lb)]' : 'bg-slate-200'}`} />)}
          </div>
        )}
        <p className={`flex items-start gap-2 text-sm font-medium ${TONE_TEXT[step.tone]}`}>
          <span className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE_DOT[step.tone]}`} aria-hidden /> {step.status}
        </p>
      </button>
      {(step.primary || showPay || step.secondary) && (
        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 px-4 py-3">
          {step.primary && (
            <button disabled={busy} onClick={() => onRun(o, step.primary!)} className={`${btnPrimary} flex-1`}>
              {busy && <Loader2 size={15} className="animate-spin" />} {step.primary.label}
            </button>
          )}
          {showPay && (
            <button onClick={() => onRun(o, { kind: 'pay', label: 'Cobrar', entregar: false })} className={`${btnSecondary} ${step.primary ? '' : 'flex-1'}`}>
              <Wallet size={15} /> Cobrar
            </button>
          )}
          {step.secondary && (
            <button onClick={() => onRun(o, step.secondary!)} className={`${btnGhost} ${step.secondary.kind === 'cancel' ? 'hover:!text-rose-600' : ''}`}>
              {step.secondary.label}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/* ── Panel de detalle ───────────────────────────────────────────────────── */

export function OrderDrawer({ order: o, process, w, busy, onRun, onClose }: {
  order: Order; process: Proc; w: LaundryWords; busy: boolean; onRun: (o: Order, a: Action) => void; onClose: () => void;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const ex = parseExtra(o.extraInfo);
  const step = nextStep(o, process, w);
  const paid = isPaid(o);
  const home = isHome(o);
  const st = stageOf(o.estado);
  const items: any[] = Array.isArray(o.items) ? o.items : [];
  const phone = String(o.telefonoCliente || '').replace(/\D/g, '');
  const waPhone = phone.startsWith('0') && phone.length === 10 ? `593${phone.slice(1)}` : phone;
  const photos: { url: string; label: string }[] = [
    ...(ex.fotosRecepcion || []).map((u: string) => ({ url: u, label: 'Recepción' })),
    ...(ex.fotosRetiro || []).map((u: string) => ({ url: u, label: 'Retiro' })),
    ...(ex.fotosProceso || []).map((u: string) => ({ url: u, label: 'Proceso' })),
    ...(ex.fotosEntrega || []).map((u: string) => ({ url: u, label: 'Entrega' })),
    ...((ex.articulos || []) as any[]).flatMap((a) => (Array.isArray(a.fotos) ? a.fotos : []).filter((u: any) => typeof u === 'string').map((u: string) => ({ url: u, label: 'Del cliente' }))),
  ].filter((p) => typeof p.url === 'string' && p.url.length > 0).slice(0, 24);
  const timeline: any[] = Array.isArray(ex.timeline) ? [...ex.timeline].reverse() : [];
  const showPay = !paid && !isCancelled(o) && st !== 'confirmar' && step.primary?.kind !== 'pay';
  const mapsUrl = o.latitud && o.longitud ? `https://www.google.com/maps?q=${o.latitud},${o.longitud}` : o.direccionCliente ? `https://www.google.com/maps/search/${encodeURIComponent(o.direccionCliente)}` : null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-slate-950/40" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-label={`Orden #${o.numeroPedido}`} className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-start gap-3 border-b border-slate-100 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500">{st ? stageMeta(st).label : o.estado} · {home ? 'Domicilio' : 'Local'}</p>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Orden #{o.numeroPedido}</h2>
            <p className={`mt-1 flex items-start gap-2 text-sm font-medium ${TONE_TEXT[step.tone]}`}><span className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE_DOT[step.tone]}`} />{step.status}</p>
          </div>
          <button onClick={onClose} className="-mr-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar"><X size={20} /></button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* Cliente */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cliente</h3>
            <p className="mt-1.5 font-semibold text-slate-900">{o.nombreCliente}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {phone && <a href={`tel:${o.telefonoCliente}`} className={btnSecondary}><Phone size={15} /> {o.telefonoCliente}</a>}
              {waPhone && <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className={btnSecondary}><MessageCircle size={15} /> WhatsApp</a>}
            </div>
            {home && o.direccionCliente && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                <p className="flex gap-2 text-slate-800"><MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" /> {o.direccionCliente}</p>
                {o.referenciaCliente && <p className="mt-1 pl-6 text-slate-500">{o.referenciaCliente}</p>}
                {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 pl-6 font-medium text-[var(--lb)]">Ver en el mapa <ExternalLink size={13} /></a>}
              </div>
            )}
            {ex.fechaHoraRetiro && <p className="mt-2 text-sm text-slate-600">Retiro solicitado: <span className="font-medium text-slate-900">{ex.fechaHoraRetiro}</span></p>}
          </section>

          {/* Artículos y precio */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Artículos</h3>
            <ul className="mt-2 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
              {items.length ? items.map((it: any, i: number) => (
                <li key={it.id || i} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="text-slate-800">{Number(it.cantidad) || 1}× {it.nombreProducto}</span>
                  <span className="shrink-0 tabular-nums text-slate-900">{money((Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1))}</span>
                </li>
              )) : <li className="px-3 py-2.5 text-sm text-slate-600">{itemsSummary(o)}</li>}
            </ul>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Servicios</dt><dd className="tabular-nums">{money(o.subtotal)}</dd></div>
              {Number(o.costoEnvio) > 0 && <div className="flex justify-between"><dt className="text-slate-500">Envío ida y vuelta</dt><dd className="tabular-nums">{money(o.costoEnvio)}</dd></div>}
              <div className="flex items-baseline justify-between border-t border-slate-100 pt-2"><dt className="font-semibold">Total</dt><dd className="text-lg font-bold tabular-nums">{money(o.total)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Pago</dt><dd className={paid ? 'font-medium text-emerald-700' : 'font-medium text-amber-700'}>{paid ? `Pagada${ex.metodoPago ? ` · ${String(ex.metodoPago).toLowerCase()}` : ''}` : 'Por cobrar'}</dd></div>
            </dl>
            {(o.notas || ex.observaciones) && (
              <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><FileText size={15} className="mt-0.5 shrink-0" /> {o.notas || ex.observaciones}</p>
            )}
          </section>

          {/* Repartidor */}
          {home && (ex.assignedDriverName || ex.assignedDriver) && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Repartidor</h3>
              <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-800"><Bike size={15} className="text-slate-400" /> {driverName(ex)}{ex.assignedDriverPhone ? ` · ${ex.assignedDriverPhone}` : ''}</p>
            </section>
          )}

          {/* Fotos */}
          {photos.length > 0 && (
            <section>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400"><Camera size={13} /> Fotos ({photos.length})</h3>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {photos.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200" title={p.label}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.label} className="size-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Historial */}
          {timeline.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Historial</h3>
              <ol className="mt-2 space-y-3 border-l border-slate-200 pl-4">
                {timeline.slice(0, 12).map((t, i) => (
                  <li key={t.id || i} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-slate-300" aria-hidden />
                    <p className="text-slate-800">{t.action || readableState(t.estado || '')}</p>
                    <p className="text-xs text-slate-400">{new Date(t.timestamp).toLocaleString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{t.user ? ` · ${t.user}` : ''}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <Link href={`/admin/service-orders/${o.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
            Ficha completa (fotos, notas internas, repartidores) <ChevronRight size={15} />
          </Link>
        </div>

        {(step.primary || showPay || step.secondary) && (
          <footer className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {step.primary && (
              <button disabled={busy} onClick={() => onRun(o, step.primary!)} className={`${btnPrimary} flex-1 py-3`}>
                {busy && <Loader2 size={15} className="animate-spin" />} {step.primary.label}
              </button>
            )}
            {showPay && <button onClick={() => onRun(o, { kind: 'pay', label: 'Cobrar', entregar: false })} className={`${btnSecondary} py-3`}><Wallet size={15} /> Cobrar</button>}
            {step.secondary && <button onClick={() => onRun(o, step.secondary!)} className={`${btnGhost} py-3`}>{step.secondary.label}</button>}
          </footer>
        )}
      </aside>
    </div>
  );
}

/* ── Modales de acción ──────────────────────────────────────────────────── */

function PayModal({ order, entregar, onClose, onDone, onError }: {
  order: Order; entregar: boolean; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void;
}) {
  const [metodo, setMetodo] = useState('EFECTIVO');
  const [monto, setMonto] = useState(String(Number(order.total || 0).toFixed(2)));
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/shoe-care/orders/${order.id}/pay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metodoPago: metodo, monto: Number(monto), entregar }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return onError(data.error || 'No se pudo registrar el pago.');
      onDone(entregar ? 'Pago registrado y orden entregada.' : 'Pago registrado.');
    } catch {
      onError('Sin conexión. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet title={`${entregar ? 'Cobrar y entregar' : 'Registrar pago'} · #${order.numeroPedido}`} subtitle={order.nombreCliente} onClose={onClose}
      footer={<button disabled={saving || !(Number(monto) > 0)} onClick={submit} className={`${btnPrimary} w-full py-3`}>{saving ? 'Guardando…' : `Confirmar ${money(monto)}`}</button>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Forma de pago">
          {[['EFECTIVO', 'Efectivo'], ['TRANSFERENCIA', 'Transferencia'], ['TARJETA', 'Tarjeta']].map(([m, l]) => (
            <button key={m} role="radio" aria-checked={metodo === m} onClick={() => setMetodo(m)}
              className={`rounded-xl border py-2.5 text-sm font-medium transition ${metodo === m ? 'border-[var(--lb)] bg-[color-mix(in_srgb,var(--lb)_8%,white)] text-slate-900 ring-1 ring-[var(--lb)]' : 'border-slate-200 text-slate-600'}`}>{l}</button>
          ))}
        </div>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Monto recibido</span>
          <input value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className={`${fieldCls} mt-1.5 text-lg font-semibold`} />
        </label>
        <p className="text-sm text-slate-500">Total de la orden: {money(order.total)}</p>
      </div>
    </Sheet>
  );
}

function CancelModal({ order, onClose, onConfirm }: { order: Order; onClose: () => void; onConfirm: (motivo: string) => void }) {
  const [motivo, setMotivo] = useState('');
  const reasons = ['Fuera de nuestra zona', 'No hay cupo hoy', 'Servicio no disponible', 'El cliente lo pidió'];
  return (
    <Sheet title={<span className="flex items-center gap-2"><AlertTriangle size={18} className="text-rose-500" /> Cancelar #{order.numeroPedido}</span>} subtitle="Le avisaremos al cliente por WhatsApp." onClose={onClose}
      footer={<button onClick={() => onConfirm(motivo.trim())} className="w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white hover:bg-rose-700">Cancelar orden</button>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {reasons.map((r) => (
            <button key={r} onClick={() => setMotivo(r)} className={`rounded-full border px-3 py-1.5 text-sm ${motivo === r ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600'}`}>{r}</button>
          ))}
        </div>
        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (lo verá el cliente)" rows={2} className={fieldCls} />
      </div>
    </Sheet>
  );
}

type QLine = { nombreProducto: string; cantidad: number; precioUnitario: number; base: number; nivel: string | null };

function QuoteModal({ order, negocioId, brand, w, firstProcess, onClose, onDone, onError }: {
  order: Order; negocioId: string; brand: string; w: LaundryWords; firstProcess?: { estado: string; label: string };
  onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void;
}) {
  const ex = parseExtra(order.extraInfo);
  const estimado = Number(ex.cotizacion?.estimado ?? order.subtotal ?? 0);
  const [lines, setLines] = useState<QLine[]>(() => (order.items || []).map((it: any) => {
    const p = Number(it.precioUnitario) || 0;
    return { nombreProducto: String(it.nombreProducto || '').replace(/ · [^·]+$/, ''), cantidad: Number(it.cantidad) || 1, precioUnitario: p, base: p, nivel: null };
  }));
  const [levels, setLevels] = useState<{ label: string; price: number }[]>([]);
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/shoe-care/settings?negocioId=${negocioId}`).then((r) => (r.ok ? r.json() : null)).then((s) => {
      if (!s) return;
      setLevels([
        { label: 'Poco sucio', price: Number(s.precioPocoSucio) },
        { label: 'Sucio', price: Number(s.precioMedioSucio) },
        { label: 'Muy sucio', price: Number(s.precioMuySucio) },
        { label: 'Restauración', price: Number(s.precioRestauracion) },
      ].filter((x) => x.price > 0));
    }).catch(() => {});
  }, [negocioId]);

  const final = Math.round(lines.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0) * 100) / 100;
  const diff = Math.round((final - estimado) * 100) / 100;
  const set = (i: number, patch: Partial<QLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/shoe-care/orders/${order.id}/quote`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({ nombreProducto: l.nombreProducto, cantidad: l.cantidad, precioUnitario: l.precioUnitario, nivel: l.nivel })),
          nota: nota.trim() || null, siguienteEstado: firstProcess?.estado || 'EN_PROCESO',
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return onError(d.error || 'No se pudo guardar el precio.');
      onDone(d.requiereAprobacion ? 'Le enviamos el nuevo precio al cliente para que lo apruebe.' : `Precio confirmado. La orden pasó a ${(firstProcess?.label || 'proceso').toLowerCase()}.`);
    } catch {
      onError('Sin conexión. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet wide title={`Precio final · #${order.numeroPedido}`} subtitle={`Revisa ${w.lasCosas} y ajusta cada línea. El cliente vio un estimado de ${money(estimado)}.`} onClose={onClose}
      footer={
        <div className="space-y-3">
          <div className={`rounded-xl p-3 text-sm ${diff > 0.009 ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>
            <div className="flex justify-between"><span>Estimado</span><span className="tabular-nums">{money(estimado)}</span></div>
            <div className="flex justify-between font-semibold"><span>Precio final</span><span className="tabular-nums">{money(final)}</span></div>
            <p className="mt-1 text-xs">{diff > 0.009
              ? `Sube ${money(diff)}: el cliente lo aprueba antes de empezar. Si no acepta, se le devuelve sin procesar y paga solo el envío.`
              : `Igual o menor al estimado: pasa directo a ${(firstProcess?.label || 'proceso').toLowerCase()} y avisamos al cliente.`}</p>
          </div>
          <button disabled={saving || !lines.length} onClick={submit} className={`${btnPrimary} w-full py-3`}>{saving ? 'Guardando…' : diff > 0.009 ? 'Enviar precio al cliente' : 'Confirmar y empezar'}</button>
        </div>
      }>
      <div className="space-y-3">
        {lines.map((l, i) => (
          <div key={i} className="space-y-2 rounded-2xl p-3 ring-1 ring-slate-200">
            <div className="flex gap-2">
              <input value={l.nombreProducto} onChange={(e) => set(i, { nombreProducto: e.target.value })} className={`${fieldCls} py-2 text-sm`} aria-label="Descripción" />
              <button onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Quitar línea"><Trash2 size={16} /></button>
            </div>
            {levels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {l.base > 0 && (
                  <button onClick={() => set(i, { precioUnitario: l.base, nivel: null })} className={`rounded-full border px-2.5 py-1 text-xs ${l.nivel === null && l.precioUnitario === l.base ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600'}`}>
                    Como pidió {money(l.base)}
                  </button>
                )}
                {levels.map((lv) => (
                  <button key={lv.label} onClick={() => set(i, { precioUnitario: lv.price, nivel: lv.label })}
                    className={`rounded-full border px-2.5 py-1 text-xs ${l.nivel === lv.label ? 'border-[var(--lb)] bg-[var(--lb)] text-[var(--lb-ink)]' : 'border-slate-200 text-slate-600'}`}>
                    {lv.label} {money(lv.price)}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-1.5 text-slate-500">Cant.
                <input type="number" min={1} value={l.cantidad} onChange={(e) => set(i, { cantidad: Math.max(1, Number(e.target.value) || 1) })} className="w-16 rounded-lg px-2 py-1.5 ring-1 ring-slate-200 outline-none focus:ring-2" />
              </label>
              <label className="flex items-center gap-1.5 text-slate-500">$ c/u
                <input inputMode="decimal" value={String(l.precioUnitario)} onChange={(e) => set(i, { precioUnitario: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} className="w-20 rounded-lg px-2 py-1.5 ring-1 ring-slate-200 outline-none focus:ring-2" />
              </label>
              <span className="ml-auto font-semibold tabular-nums">{money(l.cantidad * l.precioUnitario)}</span>
            </div>
          </div>
        ))}
        <button onClick={() => setLines((ls) => [...ls, { nombreProducto: 'Extra', cantidad: 1, precioUnitario: 0, base: 0, nivel: null }])} className="flex items-center gap-1 text-sm font-semibold" style={{ color: brand }}>
          <Plus size={15} /> Agregar línea (extra, reparación…)
        </button>
        <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Motivo para el cliente (ej.: manchas de grasa, suela despegada)" className={`${fieldCls} text-sm`} />
      </div>
    </Sheet>
  );
}

function HandoverModal({ order, w, onClose, onSubmit }: { order: Order; w: LaundryWords; onClose: () => void; onSubmit: (codigo: string) => Promise<void> }) {
  const ex = parseExtra(order.extraInfo);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const go = async () => { if (code.length !== 4) return; setSaving(true); await onSubmit(code); setSaving(false); };
  return (
    <Sheet title={<span className="flex items-center gap-2"><KeyRound size={18} className="text-[var(--lb)]" /> Entregar #{order.numeroPedido}</span>} onClose={onClose}
      footer={<button disabled={code.length !== 4 || saving} onClick={go} className={`${btnPrimary} w-full py-3`}>{saving ? 'Verificando…' : `Entregar ${w.lasCosas}`}</button>}>
      <p className="text-sm leading-relaxed text-slate-600">Pídele a {driverName(ex)} el código que aparece en su app. Así confirmas que entregas {w.lasCosas} al repartidor correcto.</p>
      <input autoFocus inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
        placeholder="0000" aria-label="Código del repartidor"
        className="mt-4 w-full rounded-xl bg-slate-50 py-3 pl-[0.6em] text-center text-3xl font-bold tracking-[0.6em] outline-none ring-1 ring-slate-200 placeholder:text-slate-300 focus:ring-2 focus:ring-[var(--lb)]" />
    </Sheet>
  );
}

/* ── Ajustes: qué lava el negocio ───────────────────────────────────────── */

export function SettingsModal({ value, onClose, onSaved, onError }: {
  value: 'ZAPATOS' | 'ROPA' | 'AMBOS'; onClose: () => void; onSaved: (t: 'ZAPATOS' | 'ROPA' | 'AMBOS') => void; onError: (m: string) => void;
}) {
  const [t, setT] = useState(value);
  const [saving, setSaving] = useState(false);
  const opts: { k: 'ZAPATOS' | 'ROPA' | 'AMBOS'; label: string; sub: string }[] = [
    { k: 'ZAPATOS', label: 'Zapatos', sub: 'Lavado y cuidado de calzado' },
    { k: 'ROPA', label: 'Ropa', sub: 'Lavandería de prendas' },
    { k: 'AMBOS', label: 'Zapatos y ropa', sub: 'Ofreces los dos servicios' },
  ];
  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/shoe-care/service-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipoArticulo: t }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return onError(d.error || 'No se pudo guardar.');
      onSaved(t);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet title="¿Qué lavas?" subtitle="Cambia los textos de tu página, los mensajes al cliente y la app del repartidor." onClose={onClose}
      footer={<button disabled={saving} onClick={save} className={`${btnPrimary} w-full py-3`}>Guardar</button>}>
      <div className="space-y-2">
        {opts.map((o) => (
          <button key={o.k} onClick={() => setT(o.k)} className={`w-full rounded-xl border p-3 text-left transition ${t === o.k ? 'border-[var(--lb)] bg-[color-mix(in_srgb,var(--lb)_8%,white)] ring-1 ring-[var(--lb)]' : 'border-slate-200'}`}>
            <span className="block font-semibold">{o.label}</span>
            <span className="block text-sm text-slate-500">{o.sub}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/* ── Pagos a repartidores ───────────────────────────────────────────────── */

export function useDriverLegs(orders: Order[], tipoNegocio?: string, getCanonical?: (o: any) => any) {
  return useMemo(() => {
    const out: { order: Order; tipo: 'RETIRO' | 'ENTREGA'; driverKey: string; driverName: string; phone?: string | null; fee: number; paid: boolean }[] = [];
    if (!getCanonical) return out;
    for (const o of orders) {
      if (o.tipoEntrega !== 'DOMICILIO') continue;
      const ex = parseExtra(o.extraInfo);
      const c = getCanonical({ ...o, extraInfo: ex, negocio: { tipoNegocio: tipoNegocio || 'LAVANDERIA' } });
      const afterPickup = !['SOLICITADA', 'PENDIENTE_RETIRO', 'ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO', 'CANCELADO', 'CANCELADA'].includes(o.estado);
      if (afterPickup && c.pickupDriver) {
        out.push({ order: o, tipo: 'RETIRO', driverKey: c.pickupDriver.driverId || c.pickupDriver.driverName || '?', driverName: c.pickupDriver.driverName || 'Repartidor', phone: c.pickupDriver.driverPhone, fee: Number(c.pickupFee || 0), paid: c.pickupDriver.estadoCompensacion === 'PAID' });
      }
      if (['ENTREGADO', 'FINALIZADA', 'FINALIZADO'].includes(o.estado) && c.deliveryDriver) {
        out.push({ order: o, tipo: 'ENTREGA', driverKey: c.deliveryDriver.driverId || c.deliveryDriver.driverName || '?', driverName: c.deliveryDriver.driverName || 'Repartidor', phone: c.deliveryDriver.driverPhone, fee: Number(c.deliveryFee || 0), paid: c.deliveryDriver.estadoCompensacion === 'PAID' });
      }
    }
    return out;
  }, [orders, tipoNegocio, getCanonical]);
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: any; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-slate-200/80">
      <Icon className="mx-auto size-8 text-slate-300" />
      <p className="mt-3 font-semibold text-slate-800">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
