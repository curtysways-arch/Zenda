'use client';

import React, { useState } from 'react';
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
  Calendar
} from 'lucide-react';

interface GymClass {
  id: string;
  name: string;
  trainer: string;
  category: string;
  time: string;
  duration: string;
  room: string;
  capacity: number;
  bookedCount: number;
  isBooked?: boolean;
}

const INITIAL_CLASSES: GymClass[] = [
  {
    id: 'c1',
    name: 'Spinning Power Ride',
    trainer: 'Carlos Mendoza',
    category: 'Cardio & Resistencia',
    time: '07:00 AM',
    duration: '45 min',
    room: 'Sala Ciclo Indoor',
    capacity: 20,
    bookedCount: 16,
    isBooked: false
  },
  {
    id: 'c2',
    name: 'Funcional HIIT & Fuerza',
    trainer: 'Mariana Silva',
    category: 'Acondicionamiento',
    time: '08:30 AM',
    duration: '50 min',
    room: 'Zona Funcional Box',
    capacity: 15,
    bookedCount: 15,
    isBooked: false
  },
  {
    id: 'c3',
    name: 'Yoga Vinyasa & Flexibilidad',
    trainer: 'Elena Castro',
    category: 'Mente & Cuerpo',
    time: '18:00 PM',
    duration: '60 min',
    room: 'Estudio Zen',
    capacity: 18,
    bookedCount: 10,
    isBooked: false
  },
  {
    id: 'c4',
    name: 'Cross Training & Levantamiento',
    trainer: 'David Roca',
    category: 'Potencia',
    time: '19:15 PM',
    duration: '55 min',
    room: 'Box Central',
    capacity: 16,
    bookedCount: 12,
    isBooked: false
  }
];

export default function MiClasesPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [classes, setClasses] = useState<GymClass[]>(INITIAL_CLASSES);
  const [selectedDay, setSelectedDay] = useState<'HOY' | 'MANANA'>('HOY');

  const toggleBooking = (classId: string) => {
    setClasses(prev => prev.map(c => {
      if (c.id !== classId) return c;
      const isCurrentlyBooked = !!c.isBooked;
      return {
        ...c,
        isBooked: !isCurrentlyBooked,
        bookedCount: isCurrentlyBooked ? c.bookedCount - 1 : c.bookedCount + 1
      };
    }));
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
          Clases de Hoy
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
      </div>

      {/* Lista de Clases */}
      <div className="space-y-4">
        {classes.map((cls) => {
          const availableSpots = Math.max(0, cls.capacity - cls.bookedCount);
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
                    {cls.category}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {cls.name}
                  </h3>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base font-black text-slate-900 dark:text-white block font-mono">
                    {cls.time}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {cls.duration}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium truncate">{cls.trainer}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium truncate">{cls.room}</span>
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
                  onClick={() => toggleBooking(cls.id)}
                  disabled={isFull}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    cls.isBooked
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : isFull
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow'
                  }`}
                >
                  {cls.isBooked ? (
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
        })}
      </div>
    </div>
  );
}
