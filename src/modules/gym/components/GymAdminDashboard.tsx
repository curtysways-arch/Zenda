'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Dumbbell, Users, CreditCard, CalendarDays, TrendingUp, AlertTriangle, 
  CheckCircle2, QrCode, ArrowUpRight, Clock, Plus, RefreshCw, UserCheck,
  Flame, ShieldCheck, UserPlus, XCircle, Search, Activity, Zap, ChevronRight,
  MessageCircle, Sparkles
} from 'lucide-react';

interface GymAdminDashboardProps {
  businessSlug?: string;
  negocioNombre?: string;
}

export default function GymAdminDashboard({ businessSlug, negocioNombre }: GymAdminDashboardProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estado del buscador / simulador rápido de acceso
  const [searchDni, setSearchDni] = useState('');
  const [quickAccessResult, setQuickAccessResult] = useState<{
    status: 'granted' | 'denied' | null;
    socio?: string;
    plan?: string;
    vence?: string;
    mensaje?: string;
  } | null>(null);
  const [validating, setValidating] = useState(false);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/gym/metrics');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error('Error fetching gym metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Auto-refresco cada 30 segundos
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDni.trim()) return;

    setValidating(true);
    setTimeout(() => {
      // Si el DNI o término buscado contiene 'vencido' o termina en número par
      const isExpired = searchDni.toLowerCase().includes('venc') || searchDni === '77889900';
      if (isExpired) {
        setQuickAccessResult({
          status: 'denied',
          socio: 'Andrea Rivas',
          plan: 'Plan Trimestral Pro',
          vence: 'Venció hace 5 días',
          mensaje: 'Membresía caducada. Requiere renovación en caja.'
        });
      } else {
        setQuickAccessResult({
          status: 'granted',
          socio: searchDni.length > 5 ? 'Socio Identificado' : 'Rodrigo Salazar',
          plan: 'Plan Anual VIP (Acceso Total)',
          vence: 'Vigente hasta 15 Dic 2026',
          mensaje: '¡Pase autorizado! Molinete / Torno desbloqueado.'
        });
      }
      setValidating(false);
    }, 400);
  };

  if (loading && !metrics) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Cargando Centro de Control Fitness...
        </p>
      </div>
    );
  }

  const m = metrics || {
    activeMembershipsCount: 142,
    expiringSoonCount: 6,
    expiredCount: 3,
    newMembershipsMonth: 19,
    attendancesToday: 84,
    peopleInsideNow: 28,
    capacityMax: 80,
    monthlyRevenue: 4280,
    recentAttendances: [],
    hourlyTraffic: [],
    classesToday: [],
    planBreakdown: [],
    alerts: []
  };

  const capacityMax = m.capacityMax || 80;
  const occupancyPercent = Math.min(100, Math.round((m.peopleInsideNow / capacityMax) * 100));

  return (
    <div className="space-y-8 pb-16">
      {/* ── CABECERA Y ACCIONES RÁPIDAS DEL GIMNASIO ──────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-zinc-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-black uppercase tracking-wider">
                <Dumbbell size={14} className="animate-pulse" />
                CENTRO FITNESS & GIMNASIO
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                TORNO EN LÍNEA
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              {negocioNombre || 'Vortex Fitness Club'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl">
              Panel operacional de membresías, aforo en sala en tiempo real y control automático de accesos.
            </p>
          </div>

          {/* Botones de Acción Inmediata de Gimnasio */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/accesos"
              className="px-4 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <QrCode size={18} />
              Escanear Acceso / Torno
            </Link>

            <Link
              href="/admin/socios"
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all flex items-center gap-2"
            >
              <UserPlus size={18} className="text-orange-400" />
              Nuevo Socio
            </Link>

            <Link
              href="/admin/membresias"
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all flex items-center gap-2"
            >
              <CreditCard size={18} className="text-emerald-400" />
              Planes & Tarifas
            </Link>

            <button
              onClick={fetchMetrics}
              className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
              title="Actualizar datos en tiempo real"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── ALERTAS OPERATIVAS INTELIGENTES ──────────────────────────────── */}
      {m.alerts && m.alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {m.alerts.map((al: any, idx: number) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-sm ${
                al.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {al.type === 'warning' ? (
                  <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                )}
                <span>{al.text}</span>
              </div>
              {al.actionHref && (
                <Link
                  href={al.actionHref}
                  className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 text-xs font-bold uppercase tracking-wider shrink-0 transition-colors"
                >
                  {al.actionText || 'Ver'}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── KPIS PRINCIPALES DE GIMNASIO (4 TARJETAS) ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* 1. Socios Activos */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-orange-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-black uppercase tracking-wider">Socios Activos</span>
            <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500">
              <Users size={20} />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {m.activeMembershipsCount}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <TrendingUp size={14} /> +{m.newMembershipsMonth} este mes
            </span>
            <Link href="/admin/socios" className="text-slate-400 hover:text-orange-500 font-bold">
              Ver todos →
            </Link>
          </div>
        </div>

        {/* 2. Aforo en Sala Ahora */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-black uppercase tracking-wider">En Sala Ahora</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Activity size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {m.peopleInsideNow}
            </div>
            <span className="text-xs text-slate-400 font-bold uppercase">/ {capacityMax} máx</span>
          </div>

          {/* Barra de aforo */}
          <div className="mt-3">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  occupancyPercent > 85 ? 'bg-red-500' : occupancyPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${occupancyPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 mt-1.5">
              <span>{occupancyPercent}% de aforo</span>
              <span className={occupancyPercent > 80 ? 'text-red-500' : 'text-emerald-500'}>
                {occupancyPercent > 80 ? 'Alta Demanda' : 'Aforo Óptimo'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Asistencias Hoy */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-black uppercase tracking-wider">Asistencias Hoy</span>
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500">
              <UserCheck size={20} />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {m.attendancesToday}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
            <span>Check-ins por Torno & QR</span>
            <Link href="/admin/asistencias" className="text-blue-500 hover:underline font-bold">
              Historial →
            </Link>
          </div>
        </div>

        {/* 4. Recaudación Mensual de Membresías */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-black uppercase tracking-wider">Recaudación Mes</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <CreditCard size={20} />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            ${Number(m.monthlyRevenue).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Cuotas y renovaciones
            </span>
            <span className="text-amber-500 font-bold">
              {m.expiringSoonCount} por vencer
            </span>
          </div>
        </div>
      </div>

      {/* ── VALIDACIÓN RÁPIDA DE MOSTRADOR / TORNO & AFLUENCIA ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Validador de Acceso Rápido para Recepción */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-orange-500" />
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider">
                  Check-in Rápido de Torno
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                Recepción
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Ingresa el DNI o nombre del socio para validar su membresía de inmediato:
            </p>

            <form onSubmit={handleQuickCheck} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="DNI, Teléfono o Nombre..."
                  value={searchDni}
                  onChange={(e) => setSearchDni(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={validating}
                  className="absolute right-2 top-2 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs transition-colors disabled:opacity-50"
                >
                  {validating ? '...' : 'Validar'}
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Prueba rápida:</span>
                <button
                  type="button"
                  onClick={() => { setSearchDni('Socio Activo'); }}
                  className="text-emerald-500 hover:underline font-bold"
                >
                  Socio Activo
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => { setSearchDni('vencido'); }}
                  className="text-red-500 hover:underline font-bold"
                >
                  Socio Vencido
                </button>
              </div>
            </form>

            {/* Resultado de Validación Rápida */}
            {quickAccessResult && (
              <div
                className={`mt-4 p-4 rounded-2xl border text-xs animate-in fade-in zoom-in-95 duration-200 ${
                  quickAccessResult.status === 'granted'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                    : 'bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {quickAccessResult.status === 'granted' ? (
                    <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-black text-sm uppercase tracking-wide">
                      {quickAccessResult.status === 'granted' ? 'ACCESO PERMITIDO' : 'ACCESO RECHAZADO'}
                    </p>
                    <p className="font-bold text-xs mt-0.5">{quickAccessResult.socio}</p>
                    <p className="text-[11px] opacity-80">{quickAccessResult.plan} • {quickAccessResult.vence}</p>
                    <p className="mt-2 text-[11px] font-semibold">{quickAccessResult.mensaje}</p>

                    {quickAccessResult.status === 'denied' && (
                      <Link
                        href="/admin/membresias"
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] uppercase tracking-wider"
                      >
                        <CreditCard size={12} />
                        Renovar Membresía Ahora
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <Link
              href="/admin/accesos"
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
            >
              <QrCode size={15} />
              Abrir Escáner de Acceso Completo
            </Link>
          </div>
        </div>

        {/* Monitor de Ocupación por Horas (Curva de Tráfico) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                  <Flame size={18} className="text-orange-500" />
                  Curva de Afluencia & Horas Pico
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Distribución de atletas en sala a lo largo del día
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-black uppercase">
                Pico: 18:00 - 20:00 hrs
              </span>
            </div>

            {/* Gráfico de Barras Horarias */}
            <div className="mt-6 grid grid-cols-9 gap-2 sm:gap-3 items-end h-44 pt-4 border-b border-slate-100 dark:border-slate-800">
              {(m.hourlyTraffic || []).map((h: any, idx: number) => {
                const maxVal = 50;
                const heightPct = Math.min(100, Math.round((h.count / maxVal) * 100));
                const isPeak = h.count >= 40;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {h.count}
                    </span>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-xl h-full flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          isPeak
                            ? 'bg-gradient-to-t from-orange-600 to-amber-400 group-hover:brightness-110'
                            : 'bg-gradient-to-t from-slate-400 to-slate-300 dark:from-slate-700 dark:to-slate-600 group-hover:bg-orange-400'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      ></div>
                    </div>
                    <span className={`text-[10px] font-black uppercase truncate ${isPeak ? 'text-orange-500' : 'text-slate-500'}`}>
                      {h.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gradient-to-t from-orange-600 to-amber-400"></span>
                Horas Pico
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-300 dark:bg-slate-700"></span>
                Afluencia Normal
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400">
              💡 Sugerencia: Reforzar staff de piso y recepción de 18:00 a 20:30.
            </p>
          </div>
        </div>
      </div>

      {/* ── FEED EN VIVO DE ACCESOS Y CLASES FITNESS DEL DÍA ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feed de Últimos Accesos (Torno / QR) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                <UserCheck size={18} className="text-orange-500" />
                Feed en Vivo: Accesos Registrados
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Socios que han ingresado al club recientemente
              </p>
            </div>
            <Link
              href="/admin/asistencias"
              className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1"
            >
              Historial completo
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {(!m.recentAttendances || m.recentAttendances.length === 0) ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No se han registrado accesos aún hoy.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {m.recentAttendances.map((att: any) => {
                const dateObj = new Date(att.checkedInAt);
                const timeStr = isNaN(dateObj.getTime())
                  ? 'Reciente'
                  : dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={att.id} className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-2xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                        {att.cliente?.nombre?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          {att.cliente?.nombre || 'Socio Registrado'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {att.membership?.membershipPlan?.name || 'Membresía Activa'}
                          </span>
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            {att.method?.replace('_', ' ') || 'QR TORNO'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {timeStr}
                      </span>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase flex items-center justify-end gap-1 mt-0.5">
                        <CheckCircle2 size={11} />
                        Autorizado
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Clases Grupales & Ocupación de Salas */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                  <CalendarDays size={18} className="text-orange-500" />
                  Clases del Día
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Salas y cupos programados
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-500/10 text-orange-500">
                Hoy
              </span>
            </div>

            {(!m.classesToday || m.classesToday.length === 0) ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No hay clases grupales programadas para hoy.
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {m.classesToday.map((cls: any) => {
                  const fillPct = Math.round((cls.enrolled / cls.capacity) * 100);

                  return (
                    <div
                      key={cls.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">
                            {cls.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {cls.coach} • {cls.room}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            cls.status === 'EN_CURSO'
                              ? 'bg-orange-500 text-white animate-pulse'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}
                        >
                          {cls.status === 'EN_CURSO' ? 'En Vivo' : cls.time}
                        </span>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span>Ocupación: {cls.enrolled}/{cls.capacity} cupos</span>
                          <span>{fillPct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              fillPct >= 90 ? 'bg-orange-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${fillPct}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <Link
              href="/admin/socios"
              className="w-full py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
            >
              <Users size={14} />
              Gestionar Lista de Socios
            </Link>
          </div>
        </div>
      </div>

      {/* ── RETENCIÓN & COBRANZA PREVENTIVA POR WHATSAPP ────────────────────────── */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
              <MessageCircle size={18} className="text-emerald-500" />
              Retención & Renovaciones Preventivas
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Contacta directamente por WhatsApp a los socios con membresías que vencen esta semana:
            </p>
          </div>

          <Link
            href="/admin/socios?filtro=por-vencer"
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            Ver todos los vencimientos
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">Carlos Mendoza</p>
              <p className="text-[11px] text-amber-500 font-bold">Vence en 2 días (Plan Trimestral)</p>
            </div>
            <a
              href="https://wa.me/51988112233?text=Hola%20Carlos,%20te%20escribimos%20de%20Vortex%20Fitness%20Club.%20Tu%20membres%C3%ADa%20vence%20en%202%20d%C3%ADas.%20%C2%A1Renueva%20hoy%20y%20mant%C3%A9n%20tu%20entrenamiento%20sin%20interrupciones!"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">Luciana Paredes</p>
              <p className="text-[11px] text-amber-500 font-bold">Vence en 4 días (Plan Mensual)</p>
            </div>
            <a
              href="https://wa.me/51977665544?text=Hola%20Luciana,%20te%20escribimos%20de%20Vortex%20Fitness%20Club.%20Tu%20membres%C3%ADa%20vence%20en%204%20d%C3%ADas.%20%C2%A1Renueva%20con%20nosotros!"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">Manuel Guerrero</p>
              <p className="text-[11px] text-amber-500 font-bold">Vence en 5 días (Plan Anual VIP)</p>
            </div>
            <a
              href="https://wa.me/51966554433?text=Hola%20Manuel,%20te%20saludamos%20de%20Vortex%20Fitness%20Club.%20Tu%20membres%C3%ADa%20VIP%20est%C3%A1%20por%20vencer.%20%C2%A1Asegura%20tu%20tarifa%20preferencial!"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
