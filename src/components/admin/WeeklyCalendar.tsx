'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
    format, 
    addDays, 
    startOfWeek, 
    getHours, 
    isSameDay, 
    eachDayOfInterval,
    addWeeks,
    subWeeks,
    isToday,
    setHours,
    setMinutes
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    ChevronLeft, 
    ChevronRight, 
    Clock, 
    Calendar as CalendarIcon, 
    Plus, 
    Users, 
    LayoutGrid, 
    Maximize2,
    CalendarDays
} from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';

interface Cita {
    id: string;
    fecha: Date;
    horaInicio: string;
    duracion: number;
    clienteId: string;
    clienteNombre: string;
    canchaId: string;
    canchaNombre: string;
    estado: string;
}

interface WeeklyCalendarProps {
    reservas: Cita[];
    canchas: { id: string, nombre: string }[];
}

export function WeeklyCalendar({ reservas, canchas }: WeeklyCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Actualizar la línea de tiempo cada minuto
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Rango de horas (de 7am a 11pm por ejemplo)
    const hours = Array.from({ length: 17 }, (_, i) => i + 7);

    const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    // Helper para calcular posición y altura del bloque de reserva
    const HOUR_HEIGHT = 48; // Altura compacta por hora

    const getBlockStyle = (horaInicio: string, duracion: number) => {
        const [h, m] = horaInicio.split(':').map(Number);
        const top = (h - 7) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
        const height = (duracion / 60) * HOUR_HEIGHT;
        return { top: `${top}px`, height: `${height - 1}px` };
    };

    // Filtrar reservas por el día actual en el mapa (timezone-safe)
    const getReservasForDay = (day: Date) => {
        const targetStr = format(day, 'yyyy-MM-dd');
        return reservas.filter(r => {
            const resDate = new Date(r.fecha);
            const resStr = resDate.toISOString().split('T')[0];
            return resStr === targetStr;
        });
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {/* Header del Calendario - Más compacto */}
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="size-9 rounded-xl text-white flex items-center justify-center" style={{ backgroundColor: 'var(--primary-color, #0f172a)' }}>
                        <CalendarDays size={18} />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 leading-none">Tu semana</h3>
                        <p className="text-xs text-slate-500 mt-1">Toca un espacio libre para agendar</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm scale-90 md:scale-100">
                    <button 
                        onClick={prevWeek}
                        className="p-2.5 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="px-4 py-1 text-center min-w-[150px]">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-tight ">
                            {format(weekStart, 'dd')} - {format(weekEnd, 'dd')} {format(weekStart, 'MMM', { locale: es })}
                        </span>
                    </div>
                    <button 
                        onClick={nextWeek}
                        className="p-2.5 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={goToToday}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                        HOY
                    </button>
                </div>
            </div>

            {/* Grid del Calendario - Compacto */}
            <div className="relative overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                <div className="min-w-[900px] flex">
                    {/* Eje de Horas */}
                    <div className="w-16 md:w-20 shrink-0 border-r border-slate-100 bg-slate-50/30">
                        <div className="h-12 border-b border-slate-100" /> {/* Spacer */}
                        {hours.map(h => (
                            <div key={h} className="h-12 flex items-center justify-center border-b border-slate-50 relative">
                                <span className="text-xs font-bold text-slate-400 tracking-tight">
                                    {h.toString().padStart(2, '0')}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Columnas de Días */}
                    <div className="flex-1 grid grid-cols-7 relative">
                        {/* Línea de tiempo actual corregida */}
                        {isToday(currentDate) && (
                            <div 
                                className="absolute left-0 right-0 z-40 flex items-center pointer-events-none"
                                style={{ 
                                    top: `${48 + (getHours(currentTime) - 7) * HOUR_HEIGHT + (currentTime.getMinutes() / 60) * HOUR_HEIGHT}px` 
                                }}
                            >
                                <div className="size-2 bg-red-500 rounded-full ml-[-4,5px] shadow-sm shadow-red-500/50" />
                                <div className="h-[1.5px] flex-1 bg-red-500/40" />
                            </div>
                        )}

                        {days.map((day, idx) => {
                            const dayReservas = getReservasForDay(day);
                            const today = isToday(day);

                            return (
                                <div key={idx} className={clsx(
                                    "relative border-r border-slate-100 min-h-[850px]",
                                    today ? "bg-slate-50/60" : "bg-white"
                                )}>
                                    {/* Header de Día Compacto */}
                                    <div className={clsx(
                                        "h-12 flex items-center justify-center gap-3 border-b border-slate-100 sticky top-0 z-30 transition-all",
                                        today ? "text-white shadow-md rounded-b-xl" : "bg-white/95 backdrop-blur-sm text-slate-900"
                                    )} style={today ? { backgroundColor: 'var(--primary-color, #0f172a)' } : undefined}>
                                        <span className="text-xs font-bold uppercase tracking-tight opacity-70 ">
                                            {format(day, 'EEE', { locale: es })}
                                        </span>
                                        <span className="text-sm font-bold tracking-tight ">
                                            {format(day, 'dd')}
                                        </span>
                                    </div>

                                    {/* Celdas de Hora para cliquear */}
                                    {hours.map(h => (
                                        <div key={h} className="h-12 border-b border-slate-50 group/slot relative">
                                            <Link 
                                                href={`/admin/citas/nueva?fecha=${format(day, 'yyyy-MM-dd')}&hora=${h}:00`}
                                                className="absolute inset-0 opacity-0 group-hover/slot:opacity-100 bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold uppercase tracking-wide transition-all z-10"
                                            >
                                                +
                                            </Link>
                                        </div>
                                    ))}

                                    {/* Bloques de Reserva Compactos */}
                                    <div className="absolute top-12 bottom-0 left-0 right-0 pointer-events-none z-20">
                                        {dayReservas.map(res => {
                                            const status = res.estado?.toLowerCase() || 'pending';
                                            const isPending = status === 'pending' || status === 'pendiente';
                                            const isConfirmed = status === 'confirmed' || status === 'approved' || status === 'confirmada';
                                            const isCheckedIn = status === 'client_checked_in';
                                            const isInProgress = status === 'in_progress';
                                            const isCompleted = status === 'completed';
                                            const isNoShow = status === 'no_show';
                                            const isExpired = status === 'expired' || status === 'cancelled' || status === 'cancelada';

                                            return (
                                                <Link 
                                                    key={res.id}
                                                    href={`/admin/citas/${res.id}`}
                                                    style={getBlockStyle(res.horaInicio, res.duracion)}
                                                    className={clsx(
                                                        "absolute left-0.5 right-0.5 rounded-lg px-2 py-1.5 pointer-events-auto border transition-all duration-300 hover:scale-[1.01] hover:shadow-xl flex flex-col justify-between overflow-hidden group/reserva",
                                                        isConfirmed ? "bg-emerald-500/95 border-emerald-300 text-white shadow-lg shadow-emerald-500/10" :
                                                        isCheckedIn ? "bg-amber-500 border-amber-300 text-white shadow-lg animate-pulse" :
                                                        isInProgress ? "bg-purple-600 border-purple-400 text-white shadow-lg" :
                                                        isCompleted ? "bg-slate-800 border-slate-600 text-slate-300 opacity-90" :
                                                        isNoShow ? "bg-red-600 border-red-400 text-white" :
                                                        isExpired ? "bg-slate-200 border-slate-300 text-slate-500 opacity-60" :
                                                        "bg-amber-400 border-amber-200 text-amber-950"
                                                    )}
                                                >
                                                    <div className="space-y-0.5 overflow-hidden">
                                                        <div className="flex justify-between items-start gap-1">
                                                            <span className={clsx(
                                                                "text-xs font-bold uppercase tracking-wide px-1 py-0 rounded bg-black/10 truncate",
                                                                (isConfirmed || isCheckedIn || isInProgress || isNoShow) ? "text-white/90" : 
                                                                isExpired ? "text-slate-500" :
                                                                isCompleted ? "text-slate-400" :
                                                                "text-amber-950/70"
                                                            )}>
                                                                {res.canchaNombre} {isExpired ? '(X)' : isCheckedIn ? '(LLEGÓ)' : isInProgress ? '(PROG)' : ''}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-bold leading-none uppercase truncate ">
                                                            {res.clienteNombre}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1 opacity-80 mt-auto">
                                                        <Clock size={8} strokeWidth={3} />
                                                        <span className="text-xs font-bold tracking-tight">
                                                            {res.horaInicio}
                                                        </span>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer con Leyenda */}
            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-wrap items-center justify-center gap-8">
                <div className="flex items-center gap-2">
                    <div className="size-4 rounded-md bg-emerald-500 shadow-sm" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide ">Confirmada</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-4 rounded-md bg-amber-500 animate-pulse shadow-sm" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide ">Llegó</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-4 rounded-md bg-purple-600 shadow-sm" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide ">En Progreso</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-4 rounded-md bg-slate-800 shadow-sm" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide ">Completado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-4 rounded-md bg-amber-400 shadow-sm" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide ">Pendiente</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-4 rounded-md bg-red-600 shadow-sm" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide ">No Show</span>
                </div>
                <div className="ml-auto hidden md:flex items-center gap-4 px-6 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
                    <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide ">Check-in inteligente activo</span>
                </div>
            </div>
        </div>
    );
}
