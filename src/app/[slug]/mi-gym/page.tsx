'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  QrCode, 
  Dumbbell, 
  CalendarCheck, 
  CreditCard, 
  TrendingUp, 
  Sparkles, 
  Flame, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  LogOut, 
  User, 
  ChevronRight, 
  Zap,
  RefreshCw,
  Phone,
  ShieldCheck,
  Award
} from 'lucide-react';

interface MemberData {
  member: {
    id: string;
    nombre: string;
    telefono: string;
    email?: string;
    avatarUrl?: string;
    qrCode: string;
    qrToken?: string;
  };
  activeMembership: {
    id: string;
    planName: string;
    status: string;
    price: number;
    startDate: string;
    endDate: string;
    remainingDays: number;
    autoRenew: boolean;
    features: string[];
  } | null;
  metrics: {
    visitsThisMonth: number;
    weeklyStreak: number;
    totalMinutesThisMonth: number;
  };
  isInside: boolean;
  currentAttendance?: {
    id: string;
    checkedInAt: string;
    minutesElapsed: number;
  };
  capabilities?: {
    workouts: boolean;
    progress: boolean;
    classes: boolean;
    loyalty: boolean;
  };
}

export default function MiGymDashboardPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [phone, setPhone] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [error, setError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [insideSeconds, setInsideSeconds] = useState(0);

  // 1. Cargar número de socio o sesión
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
      fetchMemberInfo(storedPhone);
    } else {
      // Intentar consultar sesión por cookie
      fetchMemberInfo();
    }
  }, [slug]);

  // Timer en vivo para cuando el socio está dentro del gimnasio
  useEffect(() => {
    if (memberData?.isInside && memberData.currentAttendance?.checkedInAt) {
      const checkInTime = new Date(memberData.currentAttendance.checkedInAt).getTime();
      const updateElapsed = () => {
        const diffMs = Math.max(0, Date.now() - checkInTime);
        setInsideSeconds(Math.floor(diffMs / 1000));
      };
      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    }
  }, [memberData?.isInside, memberData?.currentAttendance?.checkedInAt]);

  const fetchMemberInfo = async (phoneNumber?: string) => {
    setLoading(true);
    setError('');
    try {
      const query = phoneNumber ? `?phone=${encodeURIComponent(phoneNumber)}` : '';
      const res = await fetch(`/api/${slug}/gym/member/me${query}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 404) {
          setMemberData(null);
        } else {
          setError(data.error || 'No se pudo cargar la información del socio.');
        }
        return;
      }

      setMemberData(data);
      if (data.member?.telefono) {
        setPhone(data.member.telefono);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`${slug}_client_phone`, data.member.telefono);
        }
      }
    } catch (err) {
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPhone.trim()) return;
    setPhone(inputPhone.trim());
    fetchMemberInfo(inputPhone.trim());
  };

  const handleQuickCheckout = async () => {
    if (!memberData?.member?.qrCode || checkingOut) return;
    setCheckingOut(true);
    try {
      // Registrar salida usando el endpoint de auto-scan o validate
      const res = await fetch(`/api/${slug}/gym/attendance/self-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: memberData.member.telefono,
          qrCode: memberData.member.qrCode
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Refrescar estado del socio
        fetchMemberInfo(memberData.member.telefono);
      } else {
        alert(data.error || 'No se pudo registrar la salida.');
      }
    } catch (e) {
      alert('Error al registrar la salida.');
    } finally {
      setCheckingOut(false);
    }
  };

  const formatElapsed = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium text-sm">Cargando tu espacio deportivo...</p>
      </div>
    );
  }

  // Si no está identificado como socio
  if (!memberData) {
    return (
      <div className="max-w-md mx-auto p-4 md:p-6 space-y-6 pt-8 pb-24">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Portal del Socio
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Accede a tu carnet digital, rutinas, historial de entrenamientos y membresía.
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Ingresa tu Teléfono registrado
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={inputPhone}
                onChange={(e) => setInputPhone(e.target.value)}
                placeholder="Ej. +593 99 123 4567"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 transition-all text-base"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm tracking-wide"
          >
            <span>Ingresar a Mi Gym</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-2 text-center">
            <Link
              href={`/${slug}`}
              className="text-xs font-semibold text-slate-400 hover:text-emerald-500 transition-colors"
            >
              ¿Aún no eres socio? Ver planes y membresías
            </Link>
          </div>
        </form>
      </div>
    );
  }

  const { member, activeMembership, metrics, isInside } = memberData;
  const isExpired = activeMembership && activeMembership.remainingDays <= 0;
  const isExpiringSoon = activeMembership && activeMembership.remainingDays > 0 && activeMembership.remainingDays <= 5;

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 space-y-6 pb-28 pt-2">
      {/* 1. Header del Socio */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/20 border-2 border-white/20">
            {member.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">
                Mi Gym
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-400 font-medium">Socio Activo</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              ¡Hola, {member.nombre.split(' ')[0]}!
            </h1>
          </div>
        </div>

        <Link
          href={`/${slug}/mi-gym/acceso`}
          className="p-3 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white border border-slate-700/50 hover:bg-slate-800 active:scale-95 transition-all shadow-md flex items-center gap-2"
          title="Credencial Digital QR"
        >
          <QrCode className="w-5 h-5 text-emerald-400" />
        </Link>
      </div>

      {/* 2. Banner de Estado: En el Gimnasio (Live Attendance) */}
      {isInside && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white p-5 shadow-xl shadow-emerald-500/25 border border-emerald-400/30">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                <span>Dentro del Gym</span>
              </div>
              <div className="text-2xl font-black tracking-tight flex items-baseline gap-2">
                <span>{formatElapsed(insideSeconds)}</span>
                <span className="text-xs font-semibold text-emerald-100 uppercase tracking-widest">entrenando</span>
              </div>
              <p className="text-[11px] text-emerald-100/90 font-medium">
                Ingresaste hoy a las {new Date(memberData.currentAttendance?.checkedInAt || Date.now()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <button
              onClick={handleQuickCheckout}
              disabled={checkingOut}
              className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur border border-white/30 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>{checkingOut ? 'Saliendo...' : 'Marcar Salida'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Tarjeta de Membresía Principal */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-lg space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Plan Contratado
            </span>
            <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeMembership ? activeMembership.planName : 'Sin Membresía Activa'}
            </h2>
          </div>

          <div>
            {activeMembership ? (
              isExpired ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  Vencida
                </span>
              ) : isExpiringSoon ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Por Vencer ({activeMembership.remainingDays}d)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Activa
                </span>
              )
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20">
                Inactiva
              </span>
            )}
          </div>
        </div>

        {activeMembership ? (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Vencimiento: {new Date(activeMembership.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {activeMembership.remainingDays > 0 ? `${activeMembership.remainingDays} días restantes` : '0 días'}
              </span>
            </div>

            {/* Barra de progreso de días */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isExpired ? 'bg-rose-500' : isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, (activeMembership.remainingDays / 30) * 100))}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <Link
                href={`/${slug}/mi-gym/membresia`}
                className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 flex items-center gap-1 transition-colors"
              >
                <span>Ver detalles del plan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href={`/${slug}/mi-gym/acceso`}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black shadow hover:opacity-90 flex items-center gap-1.5 transition-all"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Pase QR</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="pt-2">
            <Link
              href={`/${slug}#planes`}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-xs shadow-md transition-all"
            >
              <span>Adquirir o Renovar Plan</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* 4. Métricas de Rendimiento & Constancia */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-center space-y-1 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-1">
            <Flame className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {metrics.weeklyStreak} <span className="text-xs font-normal text-slate-400">días</span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Racha Semana
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-center space-y-1 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center mx-auto mb-1">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {metrics.visitsThisMonth}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Visitas Mes
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-center space-y-1 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-1">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {Math.round(metrics.totalMinutesThisMonth / 60)} <span className="text-xs font-normal text-slate-400">hrs</span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tiempo Total
          </div>
        </div>
      </div>

      {/* 5. Menú Táctil de Accesos Rápidos */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">
          Panel de Actividades
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {/* Mi Acceso QR */}
          <Link
            href={`/${slug}/mi-gym/acceso`}
            className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 hover:border-emerald-500/50 transition-all shadow-sm flex flex-col justify-between h-32"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 group-hover:bg-emerald-500 text-emerald-500 group-hover:text-white flex items-center justify-center transition-colors">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white">Mi Acceso</h4>
              <p className="text-[11px] text-slate-400">Pase QR & Escáner Tótem</p>
            </div>
          </Link>

          {/* Historial Asistencias */}
          <Link
            href={`/${slug}/mi-gym/asistencia`}
            className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 hover:border-teal-500/50 transition-all shadow-sm flex flex-col justify-between h-32"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 group-hover:bg-teal-500 text-teal-500 group-hover:text-white flex items-center justify-center transition-colors">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white">Asistencias</h4>
              <p className="text-[11px] text-slate-400">Historial y permanencia</p>
            </div>
          </Link>

          {/* Entrenar / Rutina */}
          <Link
            href={`/${slug}/mi-gym/entrenar`}
            className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 hover:border-indigo-500/50 transition-all shadow-sm flex flex-col justify-between h-32"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 group-hover:bg-indigo-500 text-indigo-500 group-hover:text-white flex items-center justify-center transition-colors">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white">Entrenar</h4>
              <p className="text-[11px] text-slate-400">Rutinas guiadas del día</p>
            </div>
          </Link>

          {/* Clases Deportivas */}
          <Link
            href={`/${slug}/mi-gym/clases`}
            className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 hover:border-amber-500/50 transition-all shadow-sm flex flex-col justify-between h-32"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 group-hover:bg-amber-500 text-amber-500 group-hover:text-white flex items-center justify-center transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white">Clases</h4>
              <p className="text-[11px] text-slate-400">Horarios y reservas</p>
            </div>
          </Link>

          {/* Mi Progreso */}
          <Link
            href={`/${slug}/mi-gym/progreso`}
            className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 hover:border-violet-500/50 transition-all shadow-sm flex flex-col justify-between h-32"
          >
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 group-hover:bg-violet-500 text-violet-500 group-hover:text-white flex items-center justify-center transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white">Mi Progreso</h4>
              <p className="text-[11px] text-slate-400">Constancia y evolución</p>
            </div>
          </Link>

          {/* Mi Membresía */}
          <Link
            href={`/${slug}/mi-gym/membresia`}
            className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 hover:border-emerald-500/50 transition-all shadow-sm flex flex-col justify-between h-32"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 group-hover:bg-emerald-500 text-emerald-500 group-hover:text-white flex items-center justify-center transition-colors">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white">Membresía</h4>
              <p className="text-[11px] text-slate-400">Beneficios y renovación</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
