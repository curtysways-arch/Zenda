'use client';
/**
 * REPARTIDORES (dentro de Órdenes) — todo lo de entregas en un solo lugar:
 *  · En curso: órdenes esperando repartidor y las que van en camino.
 *  · Mi equipo: añadir, aprobar, pausar y quitar repartidores.
 *  · Pagos: lo que se le debe a cada repartidor por sus viajes.
 *
 * Los repartidores aprobados ven las órdenes en su app (/driver) y las aceptan; el local no asigna a mano.
 */
import { useMemo, useState } from 'react';
import {
  Bike, Phone, UserPlus, Clock, MapPin, ChevronRight, AlertTriangle, MessageCircle, Users, Wallet, Radio,
} from 'lucide-react';
import DriverTeamManager, { TeamSummary } from '@/components/admin/drivers/DriverTeamManager';
import { Order, parseExtra, since, money, readableState, driverName } from './flow';
import { btnPrimary, btnSecondary, EmptyState } from './shared';

type Sub = 'curso' | 'equipo' | 'pagos';

export const WAITING = ['ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'ESPERANDO_REPARTIDOR_ENTREGA'];
const ON_ROUTE = ['REPARTIDOR_EN_CAMINO', 'RECOGIDO', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR', 'EN_RUTA_ENTREGA', 'ESPERANDO_CLIENTE'];
const PICKUP_STATES = ['ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO'];

const waLink = (phone?: string | null, text?: string) => {
  let n = String(phone || '').replace(/\D/g, '');
  if (n.startsWith('0') && n.length === 10) n = `593${n.slice(1)}`;
  return n.length >= 9 ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null;
};

export default function DeliveriesPanel({ orders, legs, onPay, onOpen, negocioNombre, lasCosas = 'las prendas' }: {
  orders: Order[];
  legs: any[];
  onPay: (list: any[]) => Promise<void>;
  onOpen: (orderId: string) => void;
  negocioNombre?: string;
  lasCosas?: string;
}) {
  const [sub, setSub] = useState<Sub>('curso');
  const [inviteSignal, setInviteSignal] = useState(0);
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [showNotify, setShowNotify] = useState(false);

  const waiting = useMemo(() => orders.filter((o) => WAITING.includes(o.estado)).sort((a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt)), [orders]);
  const onRoute = useMemo(() => orders.filter((o) => ON_ROUTE.includes(o.estado)).sort((a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt)), [orders]);
  const pending = legs.filter((l) => !l.paid);
  const pendingTotal = pending.reduce((s, l) => s + (Number(l.fee) || 0), 0);
  const activeDrivers = (team?.equipo || []).filter((d) => d.grupo === 'ACTIVO');
  const noDrivers = team !== null && activeDrivers.length === 0;

  const addDriver = () => { setSub('equipo'); setInviteSignal((n) => n + 1); };

  const tabs: [Sub, string, number | null, any][] = [
    ['curso', 'En curso', waiting.length + onRoute.length, Radio],
    ['equipo', 'Mi equipo', team ? team.activos : null, Users],
    ['pagos', 'Pagos', pending.length, Wallet],
  ];

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Buscando repartidor" value={waiting.length} tone={waiting.length ? 'warn' : 'neutral'} onClick={() => setSub('curso')} />
        <Stat label="En camino" value={onRoute.length} tone="info" onClick={() => setSub('curso')} />
        <Stat label="Por pagar" value={money(pendingTotal)} tone={pending.length ? 'warn' : 'neutral'} onClick={() => setSub('pagos')} />
      </div>

      {/* Sub-pestañas + añadir */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Repartidores">
          {tabs.map(([k, label, n, Icon]) => (
            <button key={k} role="tab" aria-selected={sub === k} onClick={() => setSub(k)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${sub === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              <Icon size={15} className="hidden sm:block" /> {label}
              {n !== null && n > 0 && <span className={`rounded-full px-1.5 text-xs ${sub === k ? 'bg-slate-100 text-slate-700' : 'text-slate-500'}`}>{n}</span>}
            </button>
          ))}
        </div>
        <button onClick={addDriver} className={btnPrimary}><UserPlus size={16} /> Añadir repartidor</button>
      </div>

      {/* Aviso si no hay a quién mandar */}
      {noDrivers && sub !== 'equipo' && (
        <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:flex-row sm:items-center">
          <AlertTriangle size={20} className="shrink-0 text-amber-600" />
          <div className="flex-1 text-sm text-amber-950">
            <p className="font-semibold">Aún no tienes repartidores activos</p>
            <p className="mt-0.5 text-amber-900/80">Las órdenes a domicilio quedan esperando hasta que un repartidor de tu equipo las acepte en su app. Añade uno: le llega un enlace por WhatsApp para registrarse.</p>
          </div>
          <button onClick={addDriver} className={btnSecondary}><UserPlus size={15} /> Añadir</button>
        </div>
      )}

      {sub === 'curso' && (
        <div className="space-y-5">
          {waiting.length === 0 && onRoute.length === 0 ? (
            <EmptyState icon={Bike} title="No hay entregas en curso" text="Cuando confirmes un retiro o pidas repartidor para una orden lista, aparecerá aquí hasta que llegue a su destino." />
          ) : (
            <>
              {waiting.length > 0 && (
                <section>
                  <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">Esperando que un repartidor acepte</h3>
                      <p className="text-sm text-slate-500">Tu equipo las ve en su app. Si demora, avísales.</p>
                    </div>
                    {activeDrivers.length > 0 && (
                      <button onClick={() => setShowNotify((v) => !v)} className={btnSecondary}><MessageCircle size={15} /> Avisar a mi equipo</button>
                    )}
                  </div>
                  {showNotify && activeDrivers.length > 0 && (
                    <div className="mb-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">
                      <p className="px-1 pb-2 text-sm text-slate-600">Escríbele por WhatsApp a quien esté libre:</p>
                      <div className="flex flex-wrap gap-2">
                        {activeDrivers.map((d) => {
                          const href = waLink(d.telefono, `Hola ${d.nombre.split(' ')[0]}, en ${negocioNombre || 'el local'} tenemos ${waiting.length === 1 ? 'una orden' : `${waiting.length} órdenes`} esperando repartidor. Puedes aceptarla en tu app: https://citiox.com/driver`);
                          return href ? (
                            <a key={d.id} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">
                              <MessageCircle size={14} /> {d.nombre}{d.enCurso > 0 ? <span className="text-xs text-emerald-700/70">· {d.enCurso} en curso</span> : null}
                            </a>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                  <ul className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 divide-y divide-slate-100">
                    {waiting.map((o) => <Row key={o.id} o={o} onOpen={onOpen} waiting />)}
                  </ul>
                </section>
              )}
              {onRoute.length > 0 && (
                <section>
                  <h3 className="mb-2 font-semibold text-slate-900">En camino</h3>
                  <ul className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 divide-y divide-slate-100">
                    {onRoute.map((o) => <Row key={o.id} o={o} onOpen={onOpen} />)}
                  </ul>
                </section>
              )}
            </>
          )}
          <p className="flex items-start gap-2 text-xs text-slate-500">
            <Bike size={14} className="mt-0.5 shrink-0" />
            Así funciona: confirmas la orden → un repartidor de tu equipo la acepta en su app → retira o entrega con un código de seguridad. Tú solo le entregas {lasCosas} cuando llega al local.
          </p>
        </div>
      )}

      {/* El equipo queda montado (aunque oculto) para no recargarlo al cambiar de pestaña. */}
      <div className={sub === 'equipo' ? '' : 'hidden'}>
        <DriverTeamManager embedded inviteSignal={inviteSignal} onSummary={setTeam} />
      </div>

      {sub === 'pagos' && <DriverPayouts legs={legs} onPay={onPay} />}
    </div>
  );
}

function Stat({ label, value, tone, onClick }: { label: string; value: number | string; tone: 'warn' | 'info' | 'neutral'; onClick: () => void }) {
  const color = tone === 'warn' ? 'text-amber-600' : tone === 'info' ? 'text-sky-600' : 'text-slate-900';
  return (
    <button onClick={onClick} className="rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200/80 transition hover:ring-slate-300 sm:p-4">
      <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${color}`}>{value}</p>
    </button>
  );
}

function Row({ o, onOpen, waiting }: { o: Order; onOpen: (id: string) => void; waiting?: boolean }) {
  const ex = parseExtra(o.extraInfo);
  const pickup = PICKUP_STATES.includes(o.estado);
  const driver = !waiting ? driverName(ex) : null;
  const phone = ex.assignedDriverPhone || null;
  const mins = (Date.now() - new Date(ex.stateUpdatedAt || o.updatedAt).getTime()) / 60000;
  const late = waiting && mins > 20;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className={`flex h-10 w-16 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${pickup ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>
        {pickup ? 'Retiro' : 'Entrega'}
      </span>
      <button onClick={() => onOpen(o.id)} className="min-w-0 flex-1 text-left">
        <p className="truncate font-semibold text-slate-900">#{o.numeroPedido} · {o.nombreCliente}</p>
        <p className="truncate text-sm text-slate-500">
          {waiting ? (
            <span className={late ? 'font-medium text-amber-700' : ''}><Clock size={12} className="-mt-0.5 mr-1 inline" />Esperando {since(ex.stateUpdatedAt || o.updatedAt).replace('hace ', '')}</span>
          ) : (
            <span><Bike size={12} className="-mt-0.5 mr-1 inline" />{driver} · {readableState(o.estado).toLowerCase()}</span>
          )}
          {o.direccionCliente ? <span className="hidden sm:inline"> · <MapPin size={12} className="-mt-0.5 inline" /> {o.direccionCliente}</span> : null}
        </p>
      </button>
      {!waiting && phone && <a href={`tel:${phone}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label={`Llamar a ${driver}`}><Phone size={16} /></a>}
      <button onClick={() => onOpen(o.id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label="Ver orden"><ChevronRight size={18} /></button>
    </li>
  );
}

function DriverPayouts({ legs, onPay }: { legs: any[]; onPay: (list: any[]) => Promise<void> }) {
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

  if (!groups.length) {
    return <EmptyState icon={Wallet} title="Nada por pagar todavía" text="Cada retiro y cada entrega a domicilio que haga un repartidor aparece aquí para que se lo pagues." />;
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">El envío que paga el cliente cubre los viajes: cada repartidor recibe la tarifa del viaje que hizo (retiro o entrega). Le pagas tú directamente y aquí lo marcas.</p>
      {groups.map(([key, g]) => {
        const total = g.pending.reduce((s: number, l: any) => s + l.fee, 0);
        const wa = waLink(g.phone);
        return (
          <section key={key} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Bike size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{g.name}</p>
                <p className="text-xs text-slate-500">{g.pending.length ? `${g.pending.length} ${g.pending.length === 1 ? 'viaje' : 'viajes'} por pagar` : 'Al día'} · pagado {money(g.paidTotal)}</p>
              </div>
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" aria-label={`WhatsApp a ${g.name}`}><MessageCircle size={16} /></a>}
              {g.pending.length > 0 && (
                <button disabled={paying === key} onClick={async () => { setPaying(key); await onPay(g.pending); setPaying(null); }} className={btnPrimary}>Marcar pagado {money(total)}</button>
              )}
            </div>
            {g.pending.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {g.pending.map((l: any) => (
                  <li key={`${l.order.id}-${l.tipo}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
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

