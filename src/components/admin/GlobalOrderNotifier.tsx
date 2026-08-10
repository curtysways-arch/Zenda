'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Globe, Sparkles, Check, Bell, BellOff, ShoppingBag, X } from 'lucide-react';

interface PedidoItem {
  id: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
}

interface Pedido {
  id: string;
  codigo?: string;
  numeroPedido?: number;
  nombreCliente: string;
  telefonoCliente: string;
  tipoEntrega: string;
  estado: string;
  total: number;
  subtotal: number;
  costoEnvio?: number;
  createdAt: string;
  extraInfo?: any;
  items: PedidoItem[];
}

interface Props {
  primaryColor?: string;
}

export default function GlobalOrderNotifier({ primaryColor = '#ea580c' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [activeAlertOrder, setActiveAlertOrder] = useState<Pedido | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const acknowledgedIdsRef = useRef<Set<string>>(new Set());
  const activeAlertOrderRef = useRef<Pedido | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mantener ref de alerta activa sincronizado
  useEffect(() => {
    activeAlertOrderRef.current = activeAlertOrder;
  }, [activeAlertOrder]);

  // Campana cristalina de restaurante (Restaurant Service Bell Chime)
  const playAlarmSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Tono 1: Campana cálida C5 (523.25 Hz) con caída exponencial suave
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.4, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.9);

      // Armónico metálico refinado C6 (1046.5 Hz)
      const oscHarmonic = ctx.createOscillator();
      const gainHarmonic = ctx.createGain();
      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(1046.5, ctx.currentTime);
      gainHarmonic.gain.setValueAtTime(0.12, ctx.currentTime);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      oscHarmonic.connect(gainHarmonic);
      gainHarmonic.connect(ctx.destination);
      oscHarmonic.start();
      oscHarmonic.stop(ctx.currentTime + 0.7);

      // Tono 2: Campanilla de confirmación E5 (659.25 Hz) a los 160ms
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
          gain2.gain.setValueAtTime(0.45, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 1.1);
        } catch (_) {}
      }, 160);

    } catch (e) {
      console.warn('Alarma audio error:', e);
    }
  };

  // Cargar IDs reconocidos de localStorage al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem('citiox_acknowledged_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          acknowledgedIdsRef.current = new Set(parsed);
        }
      }
    } catch (_) {}
  }, []);

  // Polling único y limpio sin duplicación de observables
  useEffect(() => {
    const checkNewOrders = async () => {
      try {
        const res = await fetch('/api/admin/pedidos');
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;

        // Filtrar pedidos entrantes online (RECIBIDO, PENDIENTE o COMPROBANTE_RECIBIDO)
        const incomingOrders = data.filter((p: Pedido) => {
          const ch = (p.extraInfo?.channel || p.extraInfo?.canal || 'WEB').toUpperCase();
          return ch !== 'POS' && ch !== 'MOSTRADOR' && ['RECIBIDO', 'PENDIENTE', 'COMPROBANTE_RECIBIDO'].includes(p.estado);
        });

        // Buscar el pedido entrante más reciente que NO haya sido reconocido
        const unacknowledged = incomingOrders.find((p: Pedido) => !acknowledgedIdsRef.current.has(p.id));

        if (unacknowledged) {
          // Solo actualizar si no está activo ya el mismo pedido
          if (!activeAlertOrderRef.current || activeAlertOrderRef.current.id !== unacknowledged.id) {
            setActiveAlertOrder(unacknowledged);
          }
        } else if (activeAlertOrderRef.current && !incomingOrders.some((p: Pedido) => p.id === activeAlertOrderRef.current?.id)) {
          setActiveAlertOrder(null);
        }
      } catch (err) {
        console.error('Error comprobando nuevos pedidos:', err);
      }
    };

    checkNewOrders();
    const interval = setInterval(checkNewOrders, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Bucle de sonido de alarma mientras haya una alerta activa
  useEffect(() => {
    if (activeAlertOrder && soundEnabled) {
      playAlarmSound();
      alarmIntervalRef.current = setInterval(() => {
        playAlarmSound();
      }, 4000);
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
  }, [activeAlertOrder?.id, soundEnabled]);

  // Aceptar / Reconocer pedido y navegar a la atención del pedido
  const handleAcknowledgeAndAttend = () => {
    if (!activeAlertOrder) return;
    const targetId = activeAlertOrder.id;
    acknowledgedIdsRef.current.add(targetId);
    
    try {
      localStorage.setItem('citiox_acknowledged_orders', JSON.stringify(Array.from(acknowledgedIdsRef.current)));
    } catch (_) {}

    setActiveAlertOrder(null);

    // Navegar a la pantalla de Pedidos Online si no se está en ella
    if (pathname !== '/admin/pedidos-online') {
      router.push('/admin/pedidos-online');
    }
  };

  // Silenciar / Descartar ventana emergente
  const handleDismissAlert = () => {
    if (!activeAlertOrder) return;
    const targetId = activeAlertOrder.id;
    acknowledgedIdsRef.current.add(targetId);
    
    try {
      localStorage.setItem('citiox_acknowledged_orders', JSON.stringify(Array.from(acknowledgedIdsRef.current)));
    } catch (_) {}

    setActiveAlertOrder(null);
  };

  if (!activeAlertOrder) return null;

  const totalVal = Number(activeAlertOrder.total) || 0;
  const itemsCount = (activeAlertOrder.items || []).reduce((acc, i) => acc + (i.cantidad || 1), 0);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-amber-500 animate-in zoom-in-95 duration-200">
        
        {/* Header Modal Alarma */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
            <span className="font-black text-xs uppercase tracking-wider">¡Nuevo Pedido Web Entrante!</span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
            title={soundEnabled ? "Silenciar Alarma" : "Activar Alarma"}
          >
            {soundEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5 text-rose-300" />}
            <span>{soundEnabled ? "Alarma ON" : "Alarma OFF"}</span>
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 space-y-5 text-center">
          <div className="size-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border-2 border-amber-200 shadow-inner">
            <Globe className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">Código de Pedido</span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              #{activeAlertOrder.numeroPedido || activeAlertOrder.codigo || activeAlertOrder.id.substring(0, 6)}
            </h2>
            <p className="text-xs font-extrabold text-amber-600 mt-1">
              {activeAlertOrder.nombreCliente} • {activeAlertOrder.telefonoCliente}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600 font-bold">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <span>{itemsCount} producto(s) en pedido</span>
            </div>
            <span className="text-base font-black text-emerald-600">${totalVal.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleDismissAlert}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase rounded-2xl transition-all cursor-pointer"
            >
              Silenciar
            </button>

            <button
              type="button"
              onClick={handleAcknowledgeAndAttend}
              className="py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Atender Pedido Ahora</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
