'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bell, BellOff, BellRing, Utensils, CreditCard, Globe,
  ShoppingBag, Check, ExternalLink, X, Clock
} from 'lucide-react';

type AlertType = 'WAITER_CALL' | 'TABLE_ORDER' | 'LANDING_ORDER';

interface ActiveAlertItem {
  id: string;
  type: AlertType;
  title: string;
  subtitle?: string;
  mesaId?: string;
  mesaNombre?: string;
  mesaNumero?: number | null;
  nombreCliente?: string;
  telefonoCliente?: string;
  codigoPedido?: string | number;
  total?: number;
  itemsCount?: number;
  notas?: string;
  isBillRequest?: boolean;
  createdAt: string;
  rawPayload?: any;
}

interface Props {
  primaryColor?: string;
}

export default function GlobalOrderNotifier({ primaryColor = '#ea580c' }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [activeAlert, setActiveAlert] = useState<ActiveAlertItem | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  const acknowledgedIdsRef = useRef<Set<string>>(new Set());
  const activeAlertRef = useRef<ActiveAlertItem | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Mantener ref de alerta activa sincronizada
  useEffect(() => {
    activeAlertRef.current = activeAlert;
  }, [activeAlert]);

  // Cargar IDs reconocidos de localStorage al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem('citiox_acknowledged_alerts_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          acknowledgedIdsRef.current = new Set(parsed);
        }
      }
    } catch (_) {}
  }, []);

  const saveAcknowledgedId = (id: string) => {
    acknowledgedIdsRef.current.add(id);
    try {
      localStorage.setItem(
        'citiox_acknowledged_alerts_v2',
        JSON.stringify(Array.from(acknowledgedIdsRef.current))
      );
    } catch (_) {}
  };

  // Desbloquear AudioContext al interactuar con la página
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioCtx();
          }
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }
        }
      } catch (_) {}
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // 🔔 Sonido 1: Timbre de Mesero / Campana de Servicio (Ding-Dong de alta resonancia)
  const playWaiterBellSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const t = ctx.currentTime;

      // ── DING (880 Hz / A5) ──
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, t);
      gain1.gain.setValueAtTime(0.55, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 1.2);

      // Armónico metálico brillante
      const harm1 = ctx.createOscillator();
      const harmGain1 = ctx.createGain();
      harm1.type = 'triangle';
      harm1.frequency.setValueAtTime(1760, t);
      harmGain1.gain.setValueAtTime(0.2, t);
      harmGain1.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      harm1.connect(harmGain1);
      harmGain1.connect(ctx.destination);
      harm1.start(t);
      harm1.stop(t + 0.8);

      // ── DONG (659.25 Hz / E5) a los 220ms ──
      const t2 = t + 0.22;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, t2);
      gain2.gain.setValueAtTime(0.65, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 1.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t2);
      osc2.stop(t2 + 1.6);

      const harm2 = ctx.createOscillator();
      const harmGain2 = ctx.createGain();
      harm2.type = 'triangle';
      harm2.frequency.setValueAtTime(1318.5, t2);
      harmGain2.gain.setValueAtTime(0.25, t2);
      harmGain2.gain.exponentialRampToValueAtTime(0.001, t2 + 1.0);
      harm2.connect(harmGain2);
      harmGain2.connect(ctx.destination);
      harm2.start(t2);
      harm2.stop(t2 + 1.0);

    } catch (e) {
      console.warn('Audio mesero error:', e);
    }
  };

  // 🛍️ Sonido 2: Nuevo Pedido (Fanfarria armónica ascendente C5 -> E5 -> G5)
  const playOrderAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const t0 = ctx.currentTime;
      const notes = [
        { f: 523.25, delay: 0.0, dur: 0.9, vol: 0.45 },   // C5
        { f: 659.25, delay: 0.16, dur: 0.9, vol: 0.5 },   // E5
        { f: 783.99, delay: 0.32, dur: 1.4, vol: 0.6 }    // G5
      ];

      notes.forEach(({ f, delay, dur, vol }) => {
        const start = t0 + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur);

        const harm = ctx.createOscillator();
        const harmGain = ctx.createGain();
        harm.type = 'triangle';
        harm.frequency.setValueAtTime(f * 2, start);
        harmGain.gain.setValueAtTime(vol * 0.25, start);
        harmGain.gain.exponentialRampToValueAtTime(0.001, start + (dur * 0.7));
        harm.connect(harmGain);
        harmGain.connect(ctx.destination);
        harm.start(start);
        harm.stop(start + (dur * 0.7));
      });

    } catch (e) {
      console.warn('Audio pedido error:', e);
    }
  };

  // Polling unificado: Consulta llamadas de mesero, pedidos de mesa y pedidos online
  useEffect(() => {
    const checkIncomingEvents = async () => {
      try {
        const [resPedidos, resMesas] = await Promise.all([
          fetch('/api/admin/pedidos').catch(() => null),
          fetch('/api/admin/mesas/requests').catch(() => null)
        ]);

        const candidateAlerts: ActiveAlertItem[] = [];

        // 1. Procesar eventos del módulo de mesas (Llamadas de Mesero y Solicitudes QR)
        if (resMesas && resMesas.ok) {
          const mesasData = await resMesas.json().catch(() => null);
          if (mesasData && mesasData.success) {
            
            // A. Llamadas de mesero pendientes
            const pendingCalls = Array.isArray(mesasData.waiterCalls) ? mesasData.waiterCalls : [];
            for (const call of pendingCalls) {
              if (call.estado === 'PENDING' && !acknowledgedIdsRef.current.has(call.id)) {
                const notasLower = (call.notas || '').toLowerCase();
                const isBill = notasLower.includes('cuenta') || notasLower.includes('pagar') || notasLower.includes('cobro');

                candidateAlerts.push({
                  id: call.id,
                  type: 'WAITER_CALL',
                  title: isBill ? '¡Petición de Cuenta en Mesa!' : '¡Llamada al Mesero!',
                  subtitle: isBill ? 'El cliente solicita la cuenta para pagar' : 'El cliente solicita atención inmediata en mesa',
                  mesaId: call.tableId,
                  mesaNombre: call.table?.nombre || `Mesa #${call.table?.numero || ''}`,
                  mesaNumero: call.table?.numero,
                  notas: call.notas || 'Solicitud de atención en mesa',
                  isBillRequest: isBill,
                  createdAt: call.createdAt,
                  rawPayload: call
                });
              }
            }

            // B. Solicitudes de pedido QR pendientes de confirmación
            const pendingRequests = Array.isArray(mesasData.orderRequests) ? mesasData.orderRequests : [];
            for (const req of pendingRequests) {
              if (req.estado === 'PENDING_ADMIN_CONFIRMATION' && !acknowledgedIdsRef.current.has(req.id)) {
                const parsedItems = Array.isArray(req.items) ? req.items : [];
                candidateAlerts.push({
                  id: req.id,
                  type: 'TABLE_ORDER',
                  title: '¡Nuevo Pedido en Mesa (QR)!',
                  subtitle: 'Un comensal ha enviado un pedido desde su móvil',
                  mesaId: req.tableId,
                  mesaNombre: req.table?.nombre || `Mesa #${req.table?.numero || ''}`,
                  mesaNumero: req.table?.numero,
                  nombreCliente: req.nombreCliente || 'Comensal en mesa',
                  telefonoCliente: req.telefonoCliente,
                  total: Number(req.total) || 0,
                  itemsCount: parsedItems.reduce((acc: number, it: any) => acc + (Number(it.cantidad) || 1), 0),
                  notas: req.notas,
                  createdAt: req.createdAt,
                  rawPayload: req
                });
              }
            }
          }
        }

        // 2. Procesar pedidos de la tienda online y landing
        if (resPedidos && resPedidos.ok) {
          const pedidosData = await resPedidos.json().catch(() => null);
          if (Array.isArray(pedidosData)) {
            for (const p of pedidosData) {
              const ch = (p.extraInfo?.channel || p.extraInfo?.canal || 'WEB').toUpperCase();
              const isPOS = ch === 'POS' || ch === 'MOSTRADOR';
              const isPendingOnline = ['RECIBIDO', 'PENDIENTE', 'COMPROBANTE_RECIBIDO'].includes(p.estado);

              if (isPendingOnline && !isPOS && !acknowledgedIdsRef.current.has(p.id)) {
                const isMesaOrder = p.tipoEntrega === 'MESA' || p.extraInfo?.origin === 'TABLE_ORDER' || p.extraInfo?.tableId;

                if (isMesaOrder) {
                  candidateAlerts.push({
                    id: p.id,
                    type: 'TABLE_ORDER',
                    title: '¡Nuevo Pedido de Mesa Confirmado!',
                    subtitle: 'Pedido listo para atención en salón',
                    mesaNombre: p.extraInfo?.tableName || p.referenciaCliente || 'Mesa de Restaurante',
                    nombreCliente: p.nombreCliente || 'Comensal',
                    codigoPedido: p.numeroPedido || p.codigo || p.id.substring(0, 6),
                    total: Number(p.total) || 0,
                    itemsCount: (p.items || []).reduce((acc: number, i: any) => acc + (Number(i.cantidad) || 1), 0),
                    notas: p.notas,
                    createdAt: p.createdAt,
                    rawPayload: p
                  });
                } else {
                  candidateAlerts.push({
                    id: p.id,
                    type: 'LANDING_ORDER',
                    title: '¡Nuevo Pedido Online / Landing!',
                    subtitle: p.tipoEntrega === 'DELIVERY' ? 'Envío a Domicilio (Delivery)' : 'Retiro en Local (Pickup)',
                    nombreCliente: p.nombreCliente,
                    telefonoCliente: p.telefonoCliente,
                    codigoPedido: p.numeroPedido || p.codigo || p.id.substring(0, 6),
                    total: Number(p.total) || 0,
                    itemsCount: (p.items || []).reduce((acc: number, i: any) => acc + (Number(i.cantidad) || 1), 0),
                    notas: p.notas,
                    createdAt: p.createdAt,
                    rawPayload: p
                  });
                }
              }
            }
          }
        }

        setPendingQueueCount(candidateAlerts.length);

        // Prioridad: 1° Llamadas de mesero (urgente), 2° Pedidos de mesa, 3° Pedidos landing
        candidateAlerts.sort((a, b) => {
          const priority = { WAITER_CALL: 1, TABLE_ORDER: 2, LANDING_ORDER: 3 };
          return priority[a.type] - priority[b.type];
        });

        const topAlert = candidateAlerts[0] || null;

        if (topAlert) {
          if (!activeAlertRef.current || activeAlertRef.current.id !== topAlert.id) {
            setActiveAlert(topAlert);
          }
        } else if (activeAlertRef.current) {
          // Si ya no hay alertas activas en el servidor para la actual
          setActiveAlert(null);
        }
      } catch (err) {
        console.error('Error comprobando eventos entrantes:', err);
      }
    };

    checkIncomingEvents();
    const interval = setInterval(checkIncomingEvents, 3500);

    return () => clearInterval(interval);
  }, []);

  // Bucle de sonido mientras haya una alerta visible y activa
  useEffect(() => {
    if (activeAlert && soundEnabled) {
      if (activeAlert.type === 'WAITER_CALL') {
        playWaiterBellSound();
        alarmIntervalRef.current = setInterval(() => {
          playWaiterBellSound();
        }, 3500);
      } else {
        playOrderAlertSound();
        alarmIntervalRef.current = setInterval(() => {
          playOrderAlertSound();
        }, 4000);
      }
    } else {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    }

    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    };
  }, [activeAlert?.id, soundEnabled]);

  // Handler: Resolver llamada de mesero directamente
  const handleResolveWaiterCall = async () => {
    if (!activeAlert || activeAlert.type !== 'WAITER_CALL') return;
    setIsResolving(true);
    try {
      await fetch(`/api/admin/mesas/waiter-call/${activeAlert.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' })
      });
      saveAcknowledgedId(activeAlert.id);
      setActiveAlert(null);
    } catch (e) {
      console.error('Error resolviendo llamada:', e);
      saveAcknowledgedId(activeAlert.id);
      setActiveAlert(null);
    } finally {
      setIsResolving(false);
    }
  };

  // Handler: Ir a la sección de mesas
  const handleGoToMesas = () => {
    if (!activeAlert) return;
    saveAcknowledgedId(activeAlert.id);
    setActiveAlert(null);
    if (pathname !== '/admin/mesas') {
      router.push('/admin/mesas');
    }
  };

  // Handler: Ir a la sección de pedidos online
  const handleGoToOnlineOrders = () => {
    if (!activeAlert) return;
    saveAcknowledgedId(activeAlert.id);
    setActiveAlert(null);
    if (pathname !== '/admin/pedidos-online') {
      router.push('/admin/pedidos-online');
    }
  };

  // Handler: Silenciar / Cerrar alerta
  const handleDismissAlert = () => {
    if (!activeAlert) return;
    saveAcknowledgedId(activeAlert.id);
    setActiveAlert(null);
  };

  if (!activeAlert) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border-2 animate-in zoom-in-95 duration-200 ${
        activeAlert.type === 'WAITER_CALL'
          ? (activeAlert.isBillRequest ? 'border-amber-500' : 'border-rose-500')
          : activeAlert.type === 'TABLE_ORDER'
            ? 'border-emerald-500'
            : 'border-orange-500'
      }`}>

        {/* ── ENCABEZADO MODAL ── */}
        <div className={`p-4 text-white flex items-center justify-between shadow-md ${
          activeAlert.type === 'WAITER_CALL'
            ? (activeAlert.isBillRequest
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600'
                : 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-700')
            : activeAlert.type === 'TABLE_ORDER'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
              : 'bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600'
        }`}>
          <div className="flex items-center gap-2.5">
            {activeAlert.type === 'WAITER_CALL' ? (
              <BellRing className="w-5 h-5 text-white animate-bounce" />
            ) : activeAlert.type === 'TABLE_ORDER' ? (
              <Utensils className="w-5 h-5 text-white animate-pulse" />
            ) : (
              <ShoppingBag className="w-5 h-5 text-white animate-pulse" />
            )}
            <div>
              <span className="font-black text-xs uppercase tracking-wider block leading-tight">
                {activeAlert.title}
              </span>
              {pendingQueueCount > 1 && (
                <span className="text-[10px] font-bold bg-black/25 px-2 py-0.5 rounded-full inline-block mt-0.5">
                  1 de {pendingQueueCount} notificaciones activas
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
              title={soundEnabled ? "Silenciar Alarma" : "Activar Alarma"}
            >
              {soundEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5 text-rose-200" />}
              <span>{soundEnabled ? "Alarma ON" : "Alarma OFF"}</span>
            </button>

            <button
              type="button"
              onClick={handleDismissAlert}
              className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── CUERPO DEL MODAL SEGÚN EL TIPO DE ALERTA ── */}
        <div className="p-6 space-y-5">

          {/* 🛎️ CASO 1: LLAMADA DE MESERO */}
          {activeAlert.type === 'WAITER_CALL' && (
            <div className="space-y-4 text-center">
              <div className={`size-20 rounded-3xl flex items-center justify-center mx-auto border-2 shadow-inner ${
                activeAlert.isBillRequest
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-rose-50 border-rose-200 text-rose-600'
              }`}>
                {activeAlert.isBillRequest ? (
                  <CreditCard className="w-10 h-10 animate-pulse" />
                ) : (
                  <BellRing className="w-10 h-10 animate-bounce" />
                )}
              </div>

              <div>
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">
                  Ubicación en Salón
                </span>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                  {activeAlert.mesaNombre}
                </h2>
                <div className="inline-block mt-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-extrabold text-slate-700">
                  {activeAlert.notas}
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Llamada recibida hace instantes
                </span>
                <span className="font-bold text-slate-700">Atención en mesa</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isResolving}
                  onClick={handleResolveWaiterCall}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-2xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{isResolving ? 'Atendiendo...' : 'Atendido / Resolver'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToMesas}
                  className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ver en Mesas</span>
                </button>
              </div>
            </div>
          )}

          {/* 🍽️ CASO 2: PEDIDO EN MESA (QR O CONFIRMADO) */}
          {activeAlert.type === 'TABLE_ORDER' && (
            <div className="space-y-4 text-center">
              <div className="size-20 rounded-3xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Utensils className="w-10 h-10 animate-pulse" />
              </div>

              <div>
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">
                  Servicio en Mesa
                </span>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                  {activeAlert.mesaNombre}
                </h2>
                <p className="text-xs font-extrabold text-emerald-600 mt-1">
                  {activeAlert.nombreCliente} {activeAlert.telefonoCliente ? `• ${activeAlert.telefonoCliente}` : ''}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <ShoppingBag className="w-4 h-4 text-emerald-500" />
                  <span>{activeAlert.itemsCount || 0} producto(s) en orden</span>
                </div>
                <span className="text-lg font-black text-emerald-600">
                  ${(activeAlert.total || 0).toFixed(2)}
                </span>
              </div>

              {activeAlert.notas && (
                <p className="text-xs text-slate-500 italic bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                  &ldquo;{activeAlert.notas}&rdquo;
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDismissAlert}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase rounded-2xl transition-all cursor-pointer"
                >
                  Silenciar
                </button>

                <button
                  type="button"
                  onClick={handleGoToMesas}
                  className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase rounded-2xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Revisar en Mesas</span>
                </button>
              </div>
            </div>
          )}

          {/* 🛍️ CASO 3: PEDIDO DE LANDING / TIENDA ONLINE */}
          {activeAlert.type === 'LANDING_ORDER' && (
            <div className="space-y-4 text-center">
              <div className="size-20 rounded-3xl bg-orange-50 border-2 border-orange-200 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
                <Globe className="w-10 h-10 animate-pulse" />
              </div>

              <div>
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">
                  Código de Pedido
                </span>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                  #{activeAlert.codigoPedido}
                </h2>
                <p className="text-xs font-extrabold text-orange-600 mt-1">
                  {activeAlert.nombreCliente} {activeAlert.telefonoCliente ? `• ${activeAlert.telefonoCliente}` : ''}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <ShoppingBag className="w-4 h-4 text-orange-500" />
                  <span>{activeAlert.itemsCount || 0} producto(s) • {activeAlert.subtitle}</span>
                </div>
                <span className="text-lg font-black text-emerald-600">
                  ${(activeAlert.total || 0).toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDismissAlert}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase rounded-2xl transition-all cursor-pointer"
                >
                  Silenciar
                </button>

                <button
                  type="button"
                  onClick={handleGoToOnlineOrders}
                  className="py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs uppercase rounded-2xl shadow-lg shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Atender Pedido Ahora</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
