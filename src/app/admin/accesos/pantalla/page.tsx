'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { 
  Scan, 
  Clock, 
  Maximize2, 
  Minimize2, 
  Users, 
  ShieldCheck, 
  ArrowLeft, 
  RefreshCw,
  Sparkles,
  Zap
} from 'lucide-react';

export default function TotemPantallaPage() {
  const [token, setToken] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('Gimnasio');
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(90);
  const [countdown, setCountdown] = useState<number>(90);
  const [mode, setMode] = useState<'DYNAMIC' | 'STATIC_PRINTABLE'>('DYNAMIC');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [insideCount, setInsideCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Reloj y fecha en vivo
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch token rotativo
  const fetchTotemToken = async () => {
    try {
      const res = await fetch('/api/admin/gym/totem/token');
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setBusinessName(data.businessName || 'Gimnasio');
        setBusinessLogo(data.logoUrl || null);
        setMode(data.mode || 'DYNAMIC');
        const interval = data.expiresInSeconds || (data.mode === 'STATIC_PRINTABLE' ? 0 : 90);
        setExpiresIn(interval);
        setCountdown(interval);
      }
    } catch (e) {
      console.error('Error fetching totem token:', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch personas dentro en vivo
  const fetchLiveAttendees = async () => {
    try {
      const res = await fetch('/api/admin/gym/attendances/live');
      if (res.ok) {
        const data = await res.json();
        setInsideCount(data.insideCount || 0);
      }
    } catch (e) {
      console.error('Error fetching live count:', e);
    }
  };

  // Inicializar tokens y contadores
  useEffect(() => {
    fetchTotemToken();
    fetchLiveAttendees();

    // Actualizar conteo de socios cada 15s
    const liveInterval = setInterval(fetchLiveAttendees, 15000);
    return () => clearInterval(liveInterval);
  }, []);

  // Cuenta regresiva del token y auto-refresco a los 0s (solo si es modo dinámico)
  useEffect(() => {
    if (mode === 'STATIC_PRINTABLE' || expiresIn <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchTotemToken();
          return expiresIn;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresIn, mode]);

  // Pantalla completa toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const progressPercent = expiresIn > 0 ? ((expiresIn - countdown) / expiresIn) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden select-none font-sans">
      {/* Luces de fondo decorativas */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Barra Superior: Logo, Reloj y Acciones */}
      <header className="flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/accesos"
            className="p-3 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl border border-slate-800 transition-all shadow"
            title="Volver a Control de Acceso"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
              Tótem de Autoservicio
            </span>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {businessName}
            </h1>
          </div>
        </div>

        {/* Reloj y Fecha Central/Derecha */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-2xl md:text-3xl font-black text-white font-mono tracking-tight">
              {currentTime}
            </div>
            <div className="text-xs text-slate-400 capitalize">
              {currentDate}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-3 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl border border-slate-800 transition-all shadow"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Contenido Central: El QR Dinámico del Gimnasio */}
      <main className="flex-1 flex flex-col items-center justify-center my-6 z-10">
        <div className="relative group">
          {/* Resplandor exterior */}
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 rounded-[44px] blur-xl group-hover:blur-2xl transition-all" />

          {/* Tarjeta del QR */}
          <div className="relative bg-slate-900 border-2 border-slate-800 rounded-[38px] p-8 md:p-12 shadow-2xl flex flex-col items-center text-center max-w-md w-full">
            {/* Tag de seguridad */}
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest mb-6 ${
              mode === 'STATIC_PRINTABLE'
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <ShieldCheck className="w-4 h-4" />
              <span>{mode === 'STATIC_PRINTABLE' ? 'Punto de Acceso Fijo' : 'Acceso Seguro Dinámico'}</span>
            </div>

            {/* Código QR */}
            <div className="p-5 bg-white rounded-3xl shadow-inner border-4 border-slate-100/10 mb-6">
              {token ? (
                <QRCodeSVG
                  value={token}
                  size={260}
                  level="H"
                  includeMargin={false}
                  className="rounded-2xl"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-slate-600">
                  <RefreshCw className="w-12 h-12 animate-spin text-emerald-400" />
                </div>
              )}
            </div>

            {/* Instrucción visual para el socio */}
            <div className="space-y-1.5">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Escanea para Entrar o Salir
              </h2>
              <p className="text-xs md:text-sm text-slate-400 max-w-xs">
                Abre la cámara de tu teléfono o ve a <strong>Mi Gym &gt; Mi Acceso</strong> en tu cuenta.
              </p>
            </div>

            {/* Barra de progreso de rotación de token o etiqueta de QR fijo */}
            {mode === 'DYNAMIC' ? (
              <div className="w-full mt-6 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" /> Código rotativo
                  </span>
                  <span className="font-bold text-slate-300">
                    Cambia en {countdown}s
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${100 - progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="w-full mt-6 py-2 px-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-center">
                <span className="text-[11px] font-medium text-slate-400">
                  Código QR Fijo Oficial • Requiere Membresía Activa
                </span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Barra Inferior: Socios dentro en tiempo real */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-850 pt-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold text-slate-400">
            Tótem Operativo • Recepción Activa
          </span>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-5 py-2.5 rounded-2xl shadow-md">
          <Users className="w-5 h-5 text-emerald-400" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white">{insideCount}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {insideCount === 1 ? 'Socio entrenando ahora' : 'Socios entrenando ahora'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
