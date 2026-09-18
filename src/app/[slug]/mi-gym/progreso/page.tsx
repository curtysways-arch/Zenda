'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  TrendingUp, 
  ArrowLeft, 
  Flame, 
  Trophy, 
  CalendarCheck, 
  Clock, 
  Zap, 
  Award, 
  CheckCircle2, 
  Lock,
  RefreshCw
} from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  desc: string;
  unlocked: boolean;
  icon: string;
}

export default function MiProgresoPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVisits: 0,
    totalMinutes: 0,
    weeklyStreak: 0,
    caloriesEstimated: 0
  });

  useEffect(() => {
    let storedPhone = '';
    if (typeof window !== 'undefined') {
      storedPhone = 
        localStorage.getItem(`${slug}_client_phone`) || 
        localStorage.getItem('user_phone') || 
        localStorage.getItem('customer_phone') || '';
    }

    fetchStats(storedPhone);
  }, [slug]);

  const fetchStats = async (phone?: string) => {
    setLoading(true);
    try {
      const query = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      const res = await fetch(`/api/${slug}/gym/member/me${query}`);
      if (res.ok) {
        const data = await res.json();
        const visits = data.metrics?.visitsThisMonth || 0;
        const minutes = data.metrics?.totalMinutesThisMonth || 0;
        setStats({
          totalVisits: visits,
          totalMinutes: minutes,
          weeklyStreak: data.metrics?.weeklyStreak || 0,
          caloriesEstimated: visits * 420 // Estimado estándar de gasto calórico por sesión de gimnasio
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  // Simular días activos esta semana en base a la racha
  const activeDaysThisWeek = Math.min(7, stats.weeklyStreak);

  const achievements: Achievement[] = [
    {
      id: 'a1',
      title: 'Primer Paso',
      desc: 'Completaste tu primera sesión en el gimnasio',
      unlocked: stats.totalVisits >= 1,
      icon: '🌱'
    },
    {
      id: 'a2',
      title: 'En Llamas',
      desc: 'Racha de 3 o más días entrenando en la semana',
      unlocked: stats.weeklyStreak >= 3,
      icon: '🔥'
    },
    {
      id: 'a3',
      title: 'Guerrero Constante',
      desc: 'Alcanzaste 10 asistencias en el mes',
      unlocked: stats.totalVisits >= 10,
      icon: '⚔️'
    },
    {
      id: 'a4',
      title: 'Leyenda del Gym',
      desc: 'Superaste las 20 asistencias mensuales',
      unlocked: stats.totalVisits >= 20,
      icon: '👑'
    }
  ];

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
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-500" />
          Mi Progreso & Constancia
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Evolución de tus entrenamientos, regularidad semanal y medallas obtenidas.
        </p>
      </div>

      {/* Racha Semanal */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500">
              Racha de Fuego
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
              {stats.weeklyStreak} días esta semana
            </h3>
          </div>

          <span className="text-xs font-bold text-slate-400">
            Objetivo: 4+ días/semana
          </span>
        </div>

        {/* Días Lunes a Domingo */}
        <div className="grid grid-cols-7 gap-2 pt-2">
          {daysOfWeek.map((day, idx) => {
            const isCompleted = idx < activeDaysThisWeek;
            return (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all border ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : day}
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Métricas Acumuladas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-2 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.caloriesEstimated.toLocaleString('es-ES')} <span className="text-xs font-medium text-slate-400">kcal</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Gasto Calórico Estimado
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-2 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {Math.round(stats.totalMinutes / 60)} <span className="text-xs font-medium text-slate-400">horas</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Entrenamiento Acumulado
            </span>
          </div>
        </div>
      </div>

      {/* Logros & Insignias */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" />
          Logros Deportivos
        </h3>

        <div className="space-y-2.5">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-3xl border transition-all flex items-center gap-4 ${
                ach.unlocked
                  ? 'bg-white dark:bg-slate-900 border-emerald-500/30 shadow-sm'
                  : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                ach.unlocked ? 'bg-emerald-500/10' : 'bg-slate-200 dark:bg-slate-800'
              }`}>
                {ach.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                    {ach.title}
                  </h4>
                  {ach.unlocked ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-white">
                      Desbloqueado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Bloqueado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {ach.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
