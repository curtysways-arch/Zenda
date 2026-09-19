'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, 
  ArrowLeft, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle2, 
  Users, 
  Flame,
  Calendar,
  Loader2,
  Check
} from 'lucide-react';

interface GymClass {
  id: string;
  name: string;
  coach: string;
  category: string;
  startTime: string;
  durationMinutes: number;
  room?: string;
  capacity: number;
  bookedCount: number;
  daysOfWeek: string;
  color?: string;
  isBooked?: boolean;
}

export default function MiClasesPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [classes, setClasses] = useState<GymClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<'HOY' | 'MANANA' | 'TODOS'>('HOY');
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [memberPhone, setMemberPhone] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const phone = localStorage.getItem(`${slug}_client_phone`) || localStorage.getItem('user_phone') || '';
      setMemberPhone(phone);
    }
  }, [slug]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/${slug}/gym/classes`);
      const data = await res.json();
      if (data.success && Array.isArray(data.classes)) {
        setClasses(data.classes);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      loadClasses();
    }
  }, [slug]);

  const handleBooking = async (cls: GymClass) => {
    if (cls.isBooked) return;

    let phone = memberPhone;
    if (!phone && typeof window !== 'undefined') {
      phone = window.prompt('Por favor ingresa tu número de teléfono de socio para registrar tu cupo:') || '';
      if (phone.trim()) {
        localStorage.setItem(`${slug}_client_phone`, phone.trim());
        setMemberPhone(phone.trim());
      } else {
        return;
      }
    }

    try {
      setBookingLoading(cls.id);
      setErrorToast(null);
      const res = await fetch(`/api/${slug}/gym/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: cls.id,
          customerPhone: phone
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo reservar el cupo');
      }

      setClasses(prev => prev.map(c => {
        if (c.id !== cls.id) return c;
        return {
          ...c,
          isBooked: true,
          bookedCount: (c.bookedCount || 0) + 1
        };
      }));

      setSuccessToast(`¡Cupo reservado para ${cls.name}! Te esperamos.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setErrorToast(err.message || 'Error al procesar reserva');
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setBookingLoading(null);
    }
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
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-500" />
          Clases Grupales
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Reserva tu cupo para las clases exclusivas guiadas por nuestros entrenadores.
        </p>
      </div>

      {/* Toasts */}
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span className="shrink-0">⚠️</span>
          <span>{errorToast}</span>
        </div>
      )}

      {/* Selector de Día */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setSelectedDay('HOY')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${
            selectedDay === 'HOY'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Hoy
        </button>
        <button
          onClick={() => setSelectedDay('MANANA')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${
            selectedDay === 'MANANA'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Mañana
        </button>
        <button
          onClick={() => setSelectedDay('TODOS')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${
            selectedDay === 'TODOS'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Todas
        </button>
      </div>

      {/* Lista de Clases */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
          <p className="text-xs text-slate-400">Cargando horario de clases...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const dayCodes = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
            const todayIdx = new Date().getDay();
            const todayCode = dayCodes[todayIdx];
            const tomorrowCode = dayCodes[(todayIdx + 1) % 7];

            const filtered = classes.filter((cls) => {
              if (selectedDay === 'TODOS') return true;
              const days = (cls.daysOfWeek || '').toUpperCase();
              if (selectedDay === 'HOY') return days.includes(todayCode) || days.includes('TODOS');
              if (selectedDay === 'MANANA') return days.includes(tomorrowCode) || days.includes('TODOS');
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="p-8 text-center rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    No hay clases programadas para este día
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Revisa las clases de mañana o la programación semanal completa.
                  </p>
                </div>
              );
            }

            return filtered.map((cls) => {
              const availableSpots = Math.max(0, cls.capacity - (cls.bookedCount || 0));
              const isFull = availableSpots === 0 && !cls.isBooked;

              return (
                <div
                  key={cls.id}
                  className={`rounded-3xl p-5 border transition-all space-y-4 shadow-sm ${
                    cls.isBooked
                      ? 'bg-emerald-500/5 border-emerald-500/40'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                        {cls.category || 'General'}
                      </span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        {cls.name}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-slate-900 dark:text-white block font-mono">
                        {cls.startTime}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {cls.durationMinutes} min
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium truncate">{cls.coach}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium truncate">{cls.room || 'Sala General'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className={isFull ? 'text-rose-500 font-bold' : 'text-slate-600 dark:text-slate-300 font-medium'}>
                        {isFull ? 'Agotado' : `${availableSpots} cupos disponibles`}
                      </span>
                    </div>

                    <button
                      onClick={() => handleBooking(cls)}
                      disabled={isFull || !!cls.isBooked || bookingLoading === cls.id}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                        cls.isBooked
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : isFull
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow'
                      }`}
                    >
                      {bookingLoading === cls.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Reservando...</span>
                        </>
                      ) : cls.isBooked ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Reservado</span>
                        </>
                      ) : isFull ? (
                        <span>Completo</span>
                      ) : (
                        <span>Reservar Cupo</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
