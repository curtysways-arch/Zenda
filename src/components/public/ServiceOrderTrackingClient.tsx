'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, Play, X, CheckCircle2, Clock, Sparkles, ShieldCheck, MessageCircle,
  Package, Truck, Store, KeyRound, Copy, Check, Receipt,
} from 'lucide-react';
import { wordsFor, type LaundryWords } from '@/lib/laundry/wording';

interface OrderItem {
  id: string;
  nombreProducto: string;
  cantidad: number | string;
  precioUnitario: number | string;
}

interface Order {
  id: string;
  numeroPedido?: number;
  estado: string;
  tipoEntrega?: string;
  nombreCliente?: string;
  direccionCliente?: string;
  subtotal?: number | string;
  costoEnvio?: number | string;
  total?: number | string;
  createdAt: string;
  items: OrderItem[];
  extraInfo?: any;
  payment?: { estado?: string } | null;
}

interface Props {
  order: Order;
  negocio: { nombre: string; slug: string; logoUrl?: string | null; colorPrimario?: string | null; whatsapp?: string | null; tipoNegocio?: string | null; configuracion?: any };
  storeSlug: string;
  showCodes?: boolean;
}

const isVideoMedia = (url?: string) => !!url && (/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url) || url.includes('/video/'));
const money = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;

const PICKUP_PHASE = ['ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'REPARTIDOR_EN_CAMINO'];
const DELIVERY_PHASE = ['ESPERANDO_REPARTIDOR_ENTREGA', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR', 'EN_RUTA_ENTREGA', 'ESPERANDO_CLIENTE'];
const PROCESS = ['RECIBIDO', 'RETIRADO', 'INSPECCIONADO', 'EN_PROCESO', 'EN_LAVADO', 'EN_SECADO', 'EN_ACABADOS', 'LAVANDO', 'SECANDO', 'DETALLADO', 'ACEPTADO', 'CAMBIOS_SOLICITADOS', 'PRODUCTOS_CONFIRMADOS'];

/** Texto principal para el cliente según el estado. */
function headline(st: string, domicilio: boolean, w: LaundryWords, extra: any): { title: string; sub: string } {
  const T = w.tusCosas.charAt(0).toUpperCase() + w.tusCosas.slice(1);
  const m: Record<string, [string, string]> = {
    SOLICITADA: ['Solicitud enviada', 'El local revisará tu orden y te confirmará por WhatsApp.'],
    PENDIENTE_RETIRO: ['Solicitud enviada', 'El local revisará tu orden y te confirmará por WhatsApp.'],
    ESPERANDO_REPARTIDOR_RETIRO: ['Orden confirmada', `Estamos asignando un repartidor para retirar ${w.tusCosas}.`],
    ESPERANDO_ACEPTACION_REPARTIDOR: ['Orden confirmada', `Estamos asignando un repartidor para retirar ${w.tusCosas}.`],
    REPARTIDOR_EN_CAMINO: ['El repartidor va a tu dirección', `Cuando llegue, ingresa el código que te muestre para entregarle ${w.tusCosas}.`],
    RECOGIDO: ['Van camino al local', `El repartidor ya tiene ${w.tusCosas} y los lleva al local.`],
    RECIBIDO: ['Llegaron al local', `Revisaremos ${w.tusCosas} y te confirmaremos el precio final.`],
    INSPECCIONADO: ['Revisados', 'Pronto empezamos.'],
    CAMBIOS_SOLICITADOS: ['Aprueba el precio final', `El local revisó ${w.tusCosas} y ajustó el precio.`],
    ACEPTADO: ['Precio aprobado', 'Pronto empezamos.'],
    EN_PROCESO: ['En proceso', `Estamos trabajando en ${w.tusCosas}.`],
    EN_LAVADO: ['En lavado', `Estamos trabajando en ${w.tusCosas}.`],
    EN_SECADO: ['En secado', `Estamos trabajando en ${w.tusCosas}.`],
    EN_ACABADOS: ['Últimos detalles', 'Ya casi está.'],
    LISTO: extra?.devolverSinServicio
      ? ['Te devolvemos tu orden', `No se procesó porque no aprobaste el precio. Solo pagas el envío.`]
      : ['¡Tu orden está lista!', domicilio ? 'Pronto saldrá hacia tu dirección.' : 'Ya puedes retirarla en el local.'],
    LISTO_PARA_ENTREGA: ['¡Tu orden está lista!', domicilio ? 'Pronto saldrá hacia tu dirección.' : 'Ya puedes retirarla en el local.'],
    ESPERANDO_REPARTIDOR_ENTREGA: ['¡Tu orden está lista!', 'Estamos asignando el repartidor que te la llevará.'],
    REPARTIDOR_ASIGNADO: ['Repartidor asignado', `Va al local a recoger ${w.tusCosas}.`],
    REPARTIDOR_EN_LOCAL: ['Repartidor en el local', `Está recogiendo ${w.tusCosas}.`],
    ENTREGADO_A_REPARTIDOR: ['Va en camino', 'Ten listo tu código de entrega.'],
    EN_RUTA_ENTREGA: ['Va en camino', 'Ten listo tu código de entrega.'],
    ESPERANDO_CLIENTE: ['El repartidor llegó', `Dale tu código de entrega para recibir ${w.tusCosas}.`],
    ENTREGADO: ['Orden entregada', '¡Gracias por tu confianza!'],
    FINALIZADA: ['Orden entregada', '¡Gracias por tu confianza!'],
    CANCELADO: ['Orden cancelada', 'Escríbenos si tienes dudas.'],
  };
  const r = m[st] || ['En proceso', `Estamos trabajando en ${w.tusCosas}.`];
  void T;
  return { title: r[0], sub: r[1] };
}

export default function ServiceOrderTrackingClient({ order, negocio, showCodes = true }: Props) {
  const router = useRouter();
  const extra = order.extraInfo || {};
  const st = order.estado;
  const domicilio = order.tipoEntrega === 'DOMICILIO';
  const brand = negocio.colorPrimario || '#0e7490';
  const [photoTab, setPhotoTab] = useState<'antes' | 'despues'>('antes');
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const w = wordsFor(negocio);
  const [codeIn, setCodeIn] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);

  const act = async (action: string, extraBody: any = {}) => {
    setSending(action);
    setMsg(null);
    try {
      const r = await fetch(`/api/public/laundry/${order.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraBody }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ t: d.error || 'No se pudo completar.', err: true });
        return;
      }
      setCodeIn('');
      router.refresh();
    } finally {
      setSending(null);
    }
  };

  // Se actualiza solo mientras la orden sigue abierta
  useEffect(() => {
    if (['ENTREGADO', 'FINALIZADA', 'CANCELADO'].includes(st)) return;
    const t = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(t);
  }, [st, router]);

  const steps = domicilio
    ? [
        { label: 'Confirmada', Icon: Clock },
        { label: 'Retiro', Icon: Truck },
        { label: 'En proceso', Icon: Sparkles },
        { label: 'Lista', Icon: Package },
        { label: 'Entrega', Icon: Truck },
        { label: 'Entregada', Icon: CheckCircle2 },
      ]
    : [
        { label: 'Recibida', Icon: Store },
        { label: 'En proceso', Icon: Sparkles },
        { label: 'Lista', Icon: Package },
        { label: 'Entregada', Icon: CheckCircle2 },
      ];

  const stepIdx = (() => {
    const done = ['ENTREGADO', 'FINALIZADA'].includes(st);
    const ready = ['LISTO', 'LISTO_PARA_ENTREGA'].includes(st);
    if (domicilio) {
      if (done) return 5;
      if (DELIVERY_PHASE.includes(st)) return 4;
      if (ready) return 3;
      if (PROCESS.includes(st)) return 2;
      if (PICKUP_PHASE.includes(st) || st === 'RECOGIDO') return 1;
      return 0;
    }
    if (done) return 3;
    if (ready) return 2;
    if (PROCESS.includes(st) && st !== 'RECIBIDO') return 1;
    return 0;
  })();

  const h = headline(st, domicilio, w, extra);
  // Entrega: el cliente le da su código al repartidor. (En el retiro es al revés: el cliente ingresa el del repartidor.)
  const pickupCode = null;
  const deliveryCode = showCodes && DELIVERY_PHASE.includes(st) ? extra.deliveryCode : null;
  const code = deliveryCode;
  const cot = extra.cotizacion || null;
  const needsApproval = showCodes && st === 'CAMBIOS_SOLICITADOS';
  const canConfirmPickup = showCodes && st === 'REPARTIDOR_EN_CAMINO';

  const subtotal = Number(order.subtotal ?? 0);
  const envio = Number(order.costoEnvio ?? 0);
  const porViaje = Math.round((envio / 2) * 100) / 100;
  const pagado = extra.pagoCliente === 'PAGADO' || ['CONFIRMADO', 'PAGO_VERIFICADO'].includes(String(order.payment?.estado || ''));

  const antes: string[] = extra.fotosRecepcion || [];
  const despues: string[] = extra.fotosEntrega || [];
  const photos = photoTab === 'antes' ? antes : despues;

  const wa = negocio.whatsapp
    ? `https://wa.me/${negocio.whatsapp.replace(/\D/g, '').replace(/^0/, '593')}?text=${encodeURIComponent(`Hola, consulto por mi orden #${order.numeroPedido || ''}`)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <a href={`/${negocio.slug}`} className="flex items-center gap-3 min-w-0">
            {negocio.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={negocio.logoUrl} alt="" className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200" />
            ) : (
              <span style={{ backgroundColor: brand }} className="w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center text-sm">
                {negocio.nombre.substring(0, 1).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-sm font-bold truncate">{negocio.nombre}</span>
              <span className="block text-xs text-slate-500">Orden #{order.numeroPedido || ''}</span>
            </span>
          </a>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" /> Escribir
            </a>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {/* Estado */}
        <section style={{ backgroundColor: st === 'CANCELADO' ? '#64748b' : brand }} className="rounded-3xl p-5 text-white">
          <p className="text-sm text-white/80">{domicilio ? 'Retiro y entrega a domicilio' : 'Atención en el local'}</p>
          <h1 className="text-2xl font-bold mt-1">{h.title}</h1>
          <p className="text-white/90 text-sm mt-1">{h.sub}</p>
          {st !== 'CANCELADO' && (
            <div className="mt-5 flex items-center">
              {steps.map((s, i) => {
                const done = i < stepIdx;
                const cur = i === stepIdx;
                return (
                  <React.Fragment key={s.label}>
                    <div className="flex flex-col items-center gap-1 w-12 shrink-0">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center ${cur ? 'bg-white text-slate-900' : done ? 'bg-white/90 text-slate-900' : 'bg-white/20 text-white'}`}>
                        {done ? <Check className="w-4 h-4" /> : <s.Icon className="w-4 h-4" />}
                      </span>
                      <span className={`text-[10px] leading-tight text-center ${cur ? 'font-bold' : 'text-white/80'}`}>{s.label}</span>
                    </div>
                    {i < steps.length - 1 && <span className={`flex-1 h-0.5 -mt-4 ${i < stepIdx ? 'bg-white/90' : 'bg-white/25'}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </section>

        {msg && (
          <p className={`text-sm px-4 py-3 rounded-2xl ${msg.err ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{msg.t}</p>
        )}

        {/* Retiro: quien entrega (el cliente) ingresa el código del repartidor */}
        {canConfirmPickup && (
          <section className="bg-white rounded-2xl ring-2 p-4 space-y-3" style={{ ['--tw-ring-color' as any]: brand }}>
            <div className="flex gap-3">
              <span style={{ backgroundColor: `${brand}14`, color: brand }} className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </span>
              <div>
                <p className="font-semibold">Entrega {w.tusCosas} con código</p>
                <p className="text-sm text-slate-600">
                  Pídele al repartidor{extra.assignedDriverName ? ` (${extra.assignedDriverName})` : ''} el código que aparece en su app y escríbelo aquí al entregarle {w.tusCosas}.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={codeIn}
                onChange={(e) => setCodeIn(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="····"
                className="flex-1 min-w-0 text-center text-2xl font-bold tracking-[0.5em] pl-[0.5em] py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 outline-none focus:ring-2"
              />
              <button
                disabled={codeIn.length !== 4 || !!sending}
                onClick={() => act('CONFIRMAR_RETIRO', { code: codeIn })}
                style={{ backgroundColor: brand }}
                className="px-5 rounded-xl text-white font-semibold disabled:opacity-50"
              >
                {sending ? '…' : 'Confirmar'}
              </button>
            </div>
            <p className="text-xs text-slate-500">Si el código no coincide, no le entregues {w.tusCosas} y escríbele al local.</p>
          </section>
        )}

        {/* Precio final: lo decide el local tras revisar; si sube, el cliente aprueba */}
        {needsApproval && cot && (
          <section className="bg-white rounded-2xl ring-2 ring-amber-300 p-4 space-y-3">
            <p className="font-semibold">El local revisó {w.tusCosas}</p>
            {cot.nota && <p className="text-sm text-slate-700 bg-amber-50 rounded-xl px-3 py-2">“{cot.nota}”</p>}
            <div className="text-sm space-y-1">
              <div className="flex justify-between text-slate-500"><span>Estimado al pedir</span><span className="tabular-nums line-through">{money(cot.estimado)}</span></div>
              <div className="flex justify-between font-semibold"><span>Precio final del servicio</span><span className="tabular-nums">{money(cot.final)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Total con envío</span><span className="tabular-nums">{money(order.total)}</span></div>
            </div>
            <div className="flex gap-2">
              <button disabled={!!sending} onClick={() => act('APROBAR_PRECIO')} style={{ backgroundColor: brand }} className="flex-1 py-3 rounded-xl text-white font-semibold disabled:opacity-60">
                Aprobar y continuar
              </button>
              <button disabled={!!sending} onClick={() => act('RECHAZAR_PRECIO')} className="px-4 py-3 rounded-xl ring-1 ring-slate-200 text-slate-700 font-medium disabled:opacity-60">
                No, devuélvanlo
              </button>
            </div>
            <p className="text-xs text-slate-500">Si no lo apruebas, te devolvemos {w.tusCosas} sin procesar y solo pagas el envío ({money(order.costoEnvio)}).</p>
          </section>
        )}

        {/* Código de seguridad */}
        {code && (
          <section className="bg-white rounded-2xl ring-2 p-4 flex items-center gap-4" style={{ ['--tw-ring-color' as any]: brand }}>
            <span style={{ backgroundColor: `${brand}14`, color: brand }} className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Tu código de entrega</p>
              <p className="text-xs text-slate-500">
                Dáselo al repartidor cuando recibas {w.tusCosas}. No lo compartas antes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { try { navigator.clipboard.writeText(String(code)); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}
              className="font-mono text-2xl font-bold tracking-[0.2em] px-3 py-1.5 rounded-xl bg-slate-100 flex items-center gap-2"
              aria-label="Copiar código"
            >
              {code} {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
            </button>
          </section>
        )}

        {/* Cuenta */}
        <section className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Receipt className="w-4 h-4 text-slate-400" /> Tu orden</h2>
          <div className="divide-y divide-slate-100">
            {order.items.map((it, i) => (
              <div key={it.id || i} className="py-2 flex justify-between gap-3 text-sm">
                <span className="text-slate-700"><b className="text-slate-900">{Number(it.cantidad)}×</b> {it.nombreProducto}</span>
                <span className="font-medium tabular-nums">{money(Number(it.precioUnitario) * Number(it.cantidad))}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600"><span>{cot?.final != null && cot?.estado !== 'RECHAZADA' ? 'Servicio (precio final)' : extra.devolverSinServicio ? 'Servicio (no realizado)' : 'Servicio (estimado)'}</span><span className="tabular-nums">{money(subtotal)}</span></div>
            {domicilio && envio > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Envío · retiro {money(porViaje)} + entrega {money(envio - porViaje)}</span>
                <span className="tabular-nums">{money(envio)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1"><span>Total</span><span className="tabular-nums">{money(order.total)}</span></div>
            <p className={`text-xs ${pagado ? 'text-emerald-600' : 'text-slate-500'}`}>
              {pagado ? 'Pagado al local. ¡Gracias!' : 'Pagas directamente al local. El repartidor no cobra.'}
              {!cot?.final && !pagado && !['ENTREGADO', 'FINALIZADA', 'CANCELADO'].includes(st) ? ` Este total es estimado: el local confirma el precio final al revisar ${w.tusCosas}.` : ''}
            </p>
          </div>
        </section>

        {/* Fotos */}
        {(antes.length > 0 || despues.length > 0) && (
          <section className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold flex items-center gap-2"><Camera className="w-4 h-4 text-slate-400" /> Fotos</h2>
              <div className="flex bg-slate-100 p-1 rounded-xl text-sm">
                {(['antes', 'despues'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setPhotoTab(k)}
                    className={`px-3 py-1 rounded-lg font-medium ${photoTab === k ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                  >
                    {k === 'antes' ? `Al recibir (${antes.length})` : `Resultado (${despues.length})`}
                  </button>
                ))}
              </div>
            </div>
            {photos.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                {photoTab === 'despues' ? 'Las fotos del resultado aparecerán cuando tu orden esté lista.' : 'Sin fotos todavía.'}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((url, i) => (
                  <button key={url + i} onClick={() => setSelected(url)} className="aspect-square rounded-xl overflow-hidden bg-slate-100 relative">
                    {isVideoMedia(url) ? (
                      <span className="w-full h-full bg-slate-900 flex items-center justify-center"><Play className="w-6 h-6 text-white" /></span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> Esta página se actualiza sola.
        </p>
      </main>

      {selected && (
        <div onClick={() => setSelected(null)} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-white/80" aria-label="Cerrar"><X className="w-6 h-6" /></button>
          {isVideoMedia(selected) ? (
            <video src={selected} controls autoPlay className="max-w-full max-h-[85vh] rounded-2xl" onClick={(e) => e.stopPropagation()} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected} alt="" className="max-w-full max-h-[85vh] object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  );
}
