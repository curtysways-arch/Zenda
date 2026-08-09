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
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sintetizador de alarma sonora usando Web Audio API
  const playAlarmSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Tono 1 (880Hz - A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.5, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.25);

      // Tono 2 (1174.66Hz - D6)
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(1174.66, ctx.currentTime);
          gain2.gain.setValueAtTime(0.6, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.35);
        } catch (_) {}
      }, 150);

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
          setAcknowledgedIds(new Set(parsed));
        }
      }
    } catch (_) {}
  }, []);

  // Polling de nuevos pedidos cada 2 segundos con detección de foco en pestaña
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

        // Buscar el pedido entrante más reciente que NO haya sido reconocido aún
        const unacknowledged = incomingOrders.find((p: Pedido) => !acknowledgedIds.has(p.id));

        if (unacknowledged) {
          setActiveAlertOrder(unacknowledged);
        } else if (activeAlertOrder && !incomingOrders.some((p: Pedido) => p.id === activeAlertOrder.id)) {
          // Si el pedido ya no está en estado PENDIENTE/RECIBIDO, cerrar la alerta
          setActiveAlertOrder(null);
        }
      } catch (err) {
        console.error('Error comprobando nuevos pedidos:', err);
      }
    };

    checkNewOrders();
    const interval = setInterval(checkNewOrders, 2000);

    const handleFocus = () => checkNewOrders();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [acknowledgedIds, activeAlertOrder]);

  // Bucle de sonido de alarma mientras haya una alerta activa
  useEffect(() => {
    if (activeAlertOrder && soundEnabled) {
      playAlarmSound();
      alarmIntervalRef.current = setInterval(() => {
        playAlarmSound();
      }, 3000);
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
  }, [activeAlertOrder, soundEnabled]);

  // Aceptar / Reconocer pedido y navegar a la atención del pedido
  const handleAcknowledgeAndAttend = () => {
    if (!activeAlertOrder) return;
    const newSet = new Set(acknowledgedIds);
    newSet.add(activeAlertOrder.id);
    setAcknowledgedIds(newSet);
    
    try {
      localStorage.setItem('citiox_acknowledged_orders', JSON.stringify(Array.from(newSet)));
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
    const newSet = new Set(acknowledgedIds);
    newSet.add(activeAlertOrder.id);
    setAcknowledgedIds(newSet);
    
    try {
      localStorage.setItem('citiox_acknowledged_orders', JSON.stringify(Array.from(newSet)));
    } catch (_) {}

    setActiveAlertOrder(null);
  };

  if (!activeAlertOrder) return null;

  const totalVal = Number(activeAlertOrder.total) || 0;
  const itemsCount = (activeAlertOrder.items || []).reduce((acc, i) => acc + (i.cantidad || 1), 0);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-amber-500 space-y-5 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Emergente */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3.5 px-6 -mx-6 -mt-6 mb-2 flex items-center justify-between shadow-md">
          <span className="font-black text-xs uppercase flex items-center gap-2 tracking-wider animate-pulse">
            <Sparkles className="w-4 h-4" /> ¡NUEVO PEDIDO WEB ENTRANTE!
          </span>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="px-2.5 py-1 bg-black/20 hover:bg-black/40 text-white rounded-lg text-[10px] font-black cursor-pointer flex items-center gap-1 transition-colors"
          >
            {soundEnabled ? (
              <>
                <Bell className="w-3 h-3 text-amber-300" /> Alarma ON
              </>
            ) : (
              <>
                <BellOff className="w-3 h-3 text-slate-300" /> Mute
              </>
            )}
          </button>
        </div>

        {/* Icono animado */}
        <div className="size-20 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black animate-bounce shadow-xl border-2 border-amber-300">
          <Globe className="w-10 h-10" />
        </div>

        {/* Información del pedido */}
        <div className="space-y-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Código de Pedido</span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            #{activeAlertOrder.codigo || activeAlertOrder.numeroPedido || activeAlertOrder.id.slice(-6).toUpperCase()}
          </h2>
          <p className="text-sm font-extrabold text-amber-600">
            {activeAlertOrder.nombreCliente} • {activeAlertOrder.telefonoCliente}
          </p>
        </div>

        {/* Resumen dinámico */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 font-bold justify-between flex items-center shadow-inner">
          <span className="flex items-center gap-1.5 text-slate-600">
            <ShoppingBag className="w-4 h-4 text-amber-500" />
            {itemsCount} producto(s) en pedido
          </span>
          <span className="text-lg font-black text-emerald-600">${totalVal.toFixed(2)}</span>
        </div>

        {/* Botones de Acción */}
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={handleDismissAlert}
            className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase rounded-2xl cursor-pointer transition-all active:scale-95"
          >
            Silenciar
          </button>
          <button
            type="button"
            onClick={handleAcknowledgeAndAttend}
            className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs uppercase rounded-2xl shadow-xl shadow-amber-500/30 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5 stroke-[3]" /> Atender Pedido Ahora
          </button>
        </div>

      </div>
    </div>
  );
}
