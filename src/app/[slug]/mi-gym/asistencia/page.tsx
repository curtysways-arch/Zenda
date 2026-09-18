'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  CalendarCheck, 
  ArrowLeft, 
  Clock, 
  Flame, 
  TrendingUp, 
  CheckCircle2, 
  Zap, 
  RefreshCw,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface AttendanceItem {
  id: string;
  checkedInAt: string;
  checkedOutAt?: string;
  durationMinutes?: number;
  formattedDuration: string;
  status: 'INSIDE' | 'COMPLETED' | 'AUTO_CLOSED';
  dateFormatted: string;
  timeRange: string;
}

export default function MiAsistenciaPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<AttendanceItem[]>([]);
  const [stats, setStats] = useState({
    totalVisits: 0,
    totalMinutes: 0,
    averageMinutes: 0
  });
  const [phone, setPhone] = useState('');

  useEffect(() => {
    let storedPhone = '';
    if (typeof window !== 'undefined') {
      storedPhone = 
        localStorage.getItem(`${slug}_client_phone`) || 
        localStorage.getItem('user_phone') || 
        localStorage.getItem('customer_phone') || '';
    }

    if (storedPhone) {
      setPhone(storedPhone);
      fetchHistory(storedPhone);
    } else {
      fetchHistory();
    }
  }, [slug]);

  const fetchHistory = async (phoneNumber?: string) => {
    setLoading(true);
    try {
      const query = phoneNumber ? `?phone=${encodeURIComponent(phoneNumber)}` : '';
      const res = await fetch(`/api/${slug}/gym/attendance/history${query}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        setStats(data.stats || { totalVisits: 0, totalMinutes: 0, averageMinutes: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 space-y-6 pb-28 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${slug}/mi-gym`}
          className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Mi Gym</span>
        </Link>

        <button
          onClick={() => fetchHistory(phone)}
          className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 active:scale-95 transition-all text-xs"
          title="Actualizar historial"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-emerald-500" />
          Historial de Asistencias
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Registro detallado de tus entrenamientos y permanencia en las instalaciones.
        </p>
      </div>

      {/* Tarjetas de Métricas de Rendimiento */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-center space-y-1 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Entrenamientos
          </span>
          <div className="text-2xl font-black text-emerald-500">
            {stats.totalVisits}
          </div>
          <span className="text-[11px] text-slate-400">Total asistencias</span>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-center space-y-1 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Tiempo Total
          </span>
          <div className="text-2xl font-black text-teal-500">
            {formatHours(stats.totalMinutes)}
          </div>
          <span className="text-[11px] text-slate-400">En el gimnasio</span>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-center space-y-1 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Promedio
          </span>
          <div className="text-2xl font-black text-indigo-500">
            {stats.averageMinutes} <span className="text-xs font-normal">m</span>
          </div>
          <span className="text-[11px] text-slate-400">Por sesión</span>
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">
          Tus Sesiones
        </h3>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Cargando registros de asistencia...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-3 bg-white/50 dark:bg-slate-900/50">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <Flame className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              Aún no tienes asistencias registradas
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Escanea tu código QR en recepción o el tótem para empezar a sumar entrenamientos.
            </p>
            <div className="pt-2">
              <Link
                href={`/${slug}/mi-gym/acceso`}
                className="px-5 py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl shadow inline-flex items-center gap-1.5"
              >
                <span>Ver Mi Pase QR</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((item) => {
              const isInside = item.status === 'INSIDE';
              return (
                <div
                  key={item.id}
                  className={`rounded-3xl p-4 border transition-all flex items-center justify-between shadow-sm ${
                    isInside
                      ? 'bg-emerald-500/5 border-emerald-500/40 shadow-emerald-500/10'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isInside
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      {isInside ? (
                        <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                      ) : (
                        <CalendarCheck className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm text-slate-900 dark:text-white capitalize truncate">
                          {item.dateFormatted}
                        </h4>
                        {isInside && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-white animate-pulse">
                            En curso
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">
                        {item.timeRange}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-slate-900 dark:text-white block">
                      {item.formattedDuration}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {isInside ? 'Entrenando' : 'Permanencia'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
