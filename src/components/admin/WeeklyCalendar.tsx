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
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Header del Calendario - Más compacto */}
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="size-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                        <CalendarDays size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Agenda Semanal</h3>
                        <p className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-1 italic">Control de Ocupación</p>
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
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter italic">
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
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
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
                                <span className="text-[9px] font-bold text-slate-400 tracking-tighter">
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
                                    today ? "bg-indigo-50/10" : "bg-white"
                                )}>
                                    {/* Header de Día Compacto */}
                                    <div className={clsx(
                                        "h-12 flex items-center justify-center gap-3 border-b border-slate-100 sticky top-0 z-30 transition-all",
                                        today ? "bg-indigo-600 text-white shadow-md rounded-b-xl" : "bg-white/95 backdrop-blur-sm text-slate-900"
                                    )}>
                                        <span className="text-[10px] font-black uppercase tracking-tight opacity-70 italic">
                                            {format(day, 'EEE', { locale: es })}
                                        </span>
                                        <span className="text-sm font-black tracking-tighter italic">
                                            {format(day, 'dd')}
                                        </span>
                                    </div>

                                    {/* Celdas de Hora para cliquear */}
                                    {hours.map(h => (
                                        <div key={h} className="h-12 border-b border-slate-50 group/slot relative">
                                            <Link 
                                                href={`/admin/citas/nueva?fecha=${format(day, 'yyyy-MM-dd')}&hora=${h}:00`}
                                                className="absolute inset-0 opacity-0 group-hover/slot:opacity-100 bg-emerald-50 text-emerald-600 flex items-center justify-center text-[8px] font-black uppercase tracking-widest transition-all z-10"
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
                                                                "text-[7px] font-black uppercase tracking-widest px-1 py-0 rounded bg-black/10 truncate",
                                                                (isConfirmed || isCheckedIn || isInProgress || isNoShow) ? "text-white/90" : 
                                                                isExpired ? "text-slate-500" :
                                                                isCompleted ? "text-slate-400" :
                                                                "text-amber-950/70"
                                                            )}>
                                                                {res.canchaNombre} {isExpired ? '(X)' : isCheckedIn ? '(LLEGÓ)' : isInProgress ? '(PROG)' : ''}
                                                            </span>
                                                        </div>
                                                        <p className="text-[9px] font-black leading-none uppercase truncate italic">
                                                            {res.clienteNombre}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1 opacity-80 mt-auto">
                                                        <Clock size={8} strokeWidth={3} />
                                                        <span className="text-[8px] font-bold tracking-tighter">
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
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Confirmada</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-4 rounded-md bg-amber-500 animate-pulse shadow-sm" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Llegó</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-4 rounded-md bg-purple-600 shadow-sm" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">En Progreso</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-4 rounded-md bg-slate-800 shadow-sm" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Completado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-4 rounded-md bg-amber-400 shadow-sm" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Pendiente</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-4 rounded-md bg-red-600 shadow-sm" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">No Show</span>
                </div>
                <div className="ml-auto hidden md:flex items-center gap-4 px-6 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
                    <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">CHECK-IN INTELIGENTE ACTIVO</span>
                </div>
            </div>
        </div>
    );
}
