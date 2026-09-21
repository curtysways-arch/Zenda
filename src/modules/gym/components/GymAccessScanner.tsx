'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  User, 
  Calendar, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  Zap,
  Tv,
  Users,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { GymAccessConfig, DEFAULT_GYM_ACCESS_CONFIG } from '@/modules/gym/types/gymAccessConfig';

interface ScanResult {
  access: 'GRANTED' | 'DENIED';
  reason?: string;
  member: {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
    avatarUrl?: string;
    status: string;
    planName?: string;
    endDate?: string;
    remainingDays?: number;
    notes?: string;
  } | null;
  logId?: string;
  attendanceId?: string;
  timestamp: string;
}

export default function GymAccessScanner() {
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [recentLogs, setRecentLogs] = useState<ScanResult[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoClearTimer, setAutoClearTimer] = useState<NodeJS.Timeout | null>(null);
  const [stats, setStats] = useState({ grantedToday: 0, deniedToday: 0 });
  const [insideCount, setInsideCount] = useState<number>(0);
  const [accessConfig, setAccessConfig] = useState<GymAccessConfig>(DEFAULT_GYM_ACCESS_CONFIG);

  const inputRef = useRef<HTMLInputElement>(null);

  // Consultar configuración de métodos de acceso
  const fetchAccessConfig = async () => {
    try {
      const res = await fetch('/api/admin/gym/access/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setAccessConfig(data.config);
        }
      }
    } catch (e) {
      console.error('Error fetching gym access config in scanner:', e);
    }
  };

  // Consultar conteo en vivo
  const fetchLiveStats = async () => {
    try {
      const res = await fetch('/api/admin/gym/attendances/live');
      if (res.ok) {
        const data = await res.json();
        setInsideCount(data.insideCount || 0);
        if (data.todayCheckIns !== undefined) {
          setStats(prev => ({
            ...prev,
            grantedToday: data.todayCheckIns
          }));
        }
      }
    } catch (e) {
      console.error('Error fetching live attendances:', e);
    }
  };

  useEffect(() => {
    fetchAccessConfig();
    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 15000);
    return () => clearInterval(interval);
  }, []);

  // Focus automático para lectores de códigos de barra / QR por hardware
  useEffect(() => {
    inputRef.current?.focus();
    const handleGlobalClick = () => {
      // Re-enfocar si el usuario hace clic fuera de otros inputs
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Web Audio API para feedback auditivo sin dependencias de audio externas
  const playSound = (type: 'success' | 'error') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'success') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc1.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start(ctx.currentTime + 0.05);
        osc1.stop(ctx.currentTime + 0.35);
        osc2.stop(ctx.currentTime + 0.35);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('No se pudo reproducir el sonido:', e);
    }
  };

  const handleValidate = async (codeToValidate?: string) => {
    const code = (codeToValidate || inputCode).trim();
    if (!code || loading) return;

    setLoading(true);
    setInputCode('');

    try {
      // Determinar si es QR o búsqueda manual
      const looksLikeQr = code.startsWith('CITIOX_GYM:') || code.startsWith('CITIOX_TOTEM:') || code.length > 28;
      const isManual = !looksLikeQr && accessConfig.primaryMethod === 'MANUAL';
      const methodToSend = isManual ? 'MANUAL_DESK' : 'DESK_SCANNER';

      const res = await fetch('/api/admin/gym/access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isManual 
            ? { identifier: code, method: methodToSend } 
            : { qrCode: code, method: methodToSend }
        )
      });

      const data = await res.json();
      const timestamp = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const result: ScanResult = {
        access: data.access === 'GRANTED' ? 'GRANTED' : 'DENIED',
        reason: data.reason || (data.access === 'GRANTED' ? 'Acceso concedido' : 'Acceso denegado'),
        member: data.member,
        logId: data.logId,
        attendanceId: data.attendanceId,
        timestamp
      };

      setLastResult(result);
      setRecentLogs(prev => [result, ...prev.slice(0, 9)]);

      if (result.access === 'GRANTED') {
        playSound('success');
        setStats(prev => ({ ...prev, grantedToday: prev.grantedToday + 1 }));
      } else {
        playSound('error');
        setStats(prev => ({ ...prev, deniedToday: prev.deniedToday + 1 }));
      }

      if (autoClearTimer) clearTimeout(autoClearTimer);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 8000);
      setAutoClearTimer(timer);

    } catch (err: any) {
      playSound('error');
      setLastResult({
        access: 'DENIED',
        reason: 'Error de conexión con el servidor',
        member: null,
        timestamp: new Date().toLocaleTimeString('es-ES')
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleValidate();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header del Scanner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Zap className="w-3 h-3 mr-1" /> Control de Acceso en Vivo
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
            <Scan className="w-8 h-8 text-emerald-400" />
            Torno & Recepción
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Escaneo continuo por lector QR, código de barras o búsqueda manual de socios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Conteo de personas dentro */}
          <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <div className="text-emerald-400 font-black text-base leading-none">{insideCount}</div>
              <div className="text-emerald-300/80 text-[10px] font-bold uppercase tracking-wider">Dentro Ahora</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 text-xs">
            <div className="text-right">
              <div className="text-emerald-400 font-bold text-base leading-none">{stats.grantedToday}</div>
              <div className="text-slate-400 text-[10px]">Permitidos</div>
            </div>
            <div className="h-6 w-px bg-slate-700" />
            <div className="text-right">
              <div className="text-rose-400 font-bold text-base leading-none">{stats.deniedToday}</div>
              <div className="text-slate-400 text-[10px]">Rechazados</div>
            </div>
          </div>

          {/* Botón Configurar Métodos de Acceso */}
          <Link
            href="/admin/config"
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 flex items-center gap-2 text-xs font-bold transition-all shadow-sm"
            title="Ir a Configuración de Métodos de Acceso"
          >
            <Settings className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Configuración</span>
          </Link>

          {/* Botón Abrir Pantalla Tótem */}
          <Link
            href="/admin/accesos/pantalla"
            target="_blank"
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 flex items-center gap-2 text-xs font-bold transition-all shadow-sm"
            title="Abrir Tótem para Tablet o TV de Recepción"
          >
            <Tv className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Modo Pantalla Tótem</span>
          </Link>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
            className={`p-2.5 rounded-xl border transition-all ${
              soundEnabled 
                ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700' 
                : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:bg-slate-800'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Input principal del Scanner de Hardware / Teclado */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder={
              accessConfig.primaryMethod === 'MANUAL'
                ? 'Ingrese cédula, número de identificación o nombre del socio...'
                : 'Pase el carnet QR por el lector o ingrese teléfono/cédula...'
            }
            disabled={loading}
            className="w-full text-lg md:text-xl font-medium px-5 py-4 pl-14 pr-36 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 shadow-lg focus:outline-none transition-all placeholder:text-slate-400"
          />
          <Scan className="w-6 h-6 text-slate-400 absolute left-5 pointer-events-none" />
          <button
            type="submit"
            disabled={loading || !inputCode.trim()}
            className="absolute right-3 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Validar</span>
          </button>
        </div>
      </form>

      {/* Visualizador de Estado de Acceso en Pantalla Completa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Central de Decisión (2 columnas) */}
        <div className="lg:col-span-2">
          {!lastResult ? (
            <div className="h-96 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4 animate-pulse">
                <Scan className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                Listo para Escanear
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md text-sm">
                Enfoque el lector de códigos de barra hacia el carnet digital del socio o digite su número de identificación.
              </p>
            </div>
          ) : lastResult.access === 'GRANTED' ? (
            <div className="rounded-2xl border-4 border-emerald-500 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 md:p-8 shadow-2xl backdrop-blur relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                <div className="w-24 h-24 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                  <CheckCircle2 className="w-16 h-16 animate-in zoom-in-50 duration-300" />
                </div>

                <div className="flex-1 text-center md:text-left space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500 text-white shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5" /> ACCESO CONCEDIDO
                  </div>

                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    {lastResult.member?.nombre || 'Socio Activo'}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-500/20 shadow-sm">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Plan</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {lastResult.member?.planName || 'Membresía Activa'}
                      </span>
                    </div>

                    <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-500/20 shadow-sm">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Vigencia</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {lastResult.member?.remainingDays !== undefined ? `${lastResult.member.remainingDays} días restantes` : 'Vigente'}
                      </span>
                    </div>

                    <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-500/20 shadow-sm">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Hora de Ingreso</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                        {lastResult.timestamp}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-slate-500 flex items-center justify-center md:justify-start gap-4">
                    {lastResult.member?.telefono && <span>📞 {lastResult.member.telefono}</span>}
                    {lastResult.member?.email && <span>✉️ {lastResult.member.email}</span>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-4 border-rose-500 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent p-6 md:p-8 shadow-2xl backdrop-blur relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                <div className="w-24 h-24 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
                  <XCircle className="w-16 h-16 animate-in zoom-in-50 duration-300" />
                </div>

                <div className="flex-1 text-center md:text-left space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-rose-500 text-white shadow-sm">
                    <AlertTriangle className="w-3.5 h-3.5" /> ACCESO DENEGADO
                  </div>

                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    {lastResult.member?.nombre || 'No Autorizado'}
                  </h2>

                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                    <p className="text-rose-600 dark:text-rose-400 font-bold text-base">
                      Motivo: {lastResult.reason}
                    </p>
                    {lastResult.member?.status && (
                      <p className="text-xs text-rose-500/80 mt-1">
                        Estado de membresía: <span className="uppercase font-semibold">{lastResult.member.status}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                    {lastResult.member?.id && (
                      <Link
                        href={`/admin/socios?id=${lastResult.member.id}`}
                        className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow hover:opacity-90 flex items-center gap-1.5"
                      >
                        <User className="w-3.5 h-3.5" /> Ver Ficha / Renovar Membresía
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel Lateral: Historial de Escaneos de la Sesión */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-96">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              Últimos Escaneos
            </h3>
            <span className="text-xs text-slate-400">Esta sesión</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {recentLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <span>No hay registros aún</span>
              </div>
            ) : (
              recentLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                    log.access === 'GRANTED'
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-800 dark:text-slate-200'
                      : 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {log.access === 'GRANTED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <div className="truncate">
                      <p className="font-bold truncate">{log.member?.nombre || 'Desconocido'}</p>
                      <p className="text-[10px] text-slate-400 truncate">{log.reason}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2 font-mono">
                    {log.timestamp}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
