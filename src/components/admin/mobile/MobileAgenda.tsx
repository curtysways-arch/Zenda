'use client';

import { useState, useMemo } from 'react';
import { format, addHours, startOfDay, eachHourOfInterval, setHours, isSameHour } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    ChevronLeft, 
    ChevronRight, 
    Plus, 
    Clock, 
    User, 
    Scissors,
    Check,
    X,
    MoreVertical,
    Calendar as CalendarIcon
} from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import Link from 'next/link';

interface MobileAgendaProps {
    citas: any[];
    primaryColor: string;
    onConfirm?: (id: string) => void;
    onCancel?: (id: string) => void;
    slug: string;
}

// Helper para obtener configuración por estado
function getStatusConfig(status: string, primaryColor: string) {
    const s = status?.toLowerCase();
    switch (s) {
        case 'confirmed':
        case 'approved':
            return { 
                label: 'Confirmada', 
                bg: 'bg-emerald-50', 
                text: 'text-emerald-600', 
                border: 'border-emerald-100',
                accent: '#10b981'
            };
        case 'client_checked_in':
            return { 
                label: 'Llegó', 
                bg: 'bg-amber-500', 
                text: 'text-white', 
                border: 'border-amber-400',
                accent: '#f59e0b',
                animate: 'animate-pulse'
            };
        case 'in_progress':
            return { 
                label: 'En Proceso', 
                bg: 'bg-purple-600', 
                text: 'text-white', 
                border: 'border-purple-500',
                accent: '#9333ea'
            };
        case 'completed':
            return { 
                label: 'Finalizada', 
                bg: 'bg-slate-100', 
                text: 'text-slate-500', 
                border: 'border-slate-200',
                accent: '#64748b'
            };
        case 'cancelled':
        case 'no_show':
            return { 
                label: s === 'no_show' ? 'No asistió' : 'Cancelada', 
                bg: 'bg-rose-50', 
                text: 'text-rose-500', 
                border: 'border-rose-100',
                accent: '#f43f5e'
            };
        case 'expired':
            return { 
                label: 'Expirada', 
                bg: 'bg-slate-50', 
                text: 'text-slate-400', 
                border: 'border-slate-100',
                accent: '#94a3b8'
            };
        default:
            return { 
                label: 'Pendiente', 
                bg: 'bg-amber-50', 
                text: 'text-amber-600', 
                border: 'border-amber-100',
                accent: '#fbbf24'
            };
    }
}

// Sub-componente para la tarjeta de cita
function AppointmentCard({ cita, primaryColor, onConfirm, onCancel }: { cita: any, primaryColor: string, onConfirm?: any, onCancel?: any }) {
    const status = getStatusConfig(cita.estado, primaryColor);
    
    return (
        <Link 
            href={`/admin/citas/${cita.id}`}
            className={cn(
                "relative block p-5 rounded-[2.5rem] border shadow-sm overflow-hidden group active:scale-[0.98] transition-all",
                status.bg,
                status.border
            )}
        >
            <div 
                className={cn("absolute left-0 top-0 bottom-0 w-2", status.animate)}
                style={{ backgroundColor: status.accent }}
            />
            
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={cn("px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border", status.text, status.border, "bg-white/50")}>
                            {status.label}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={10} className={status.text} />
                            <span className={cn("text-[9px] font-bold uppercase tabular-nums", status.text)}>
                                {cita.horaInicio} - {cita.horaFin}
                            </span>
                        </div>
                    </div>
                    
                    <h4 className={cn("text-base font-black uppercase italic leading-none truncate", status.text === 'text-white' ? 'text-white' : 'text-slate-900')}>
                        {cita.cliente?.nombre || 'Cliente'}
                    </h4>
                    
                    <div className="flex items-center gap-2 mt-2">
                        <div className="p-1.5 rounded-lg bg-white/40 border border-white/20 backdrop-blur-sm">
                            <Scissors size={10} className={status.text === 'text-white' ? 'text-white' : 'text-slate-400'} />
                        </div>
                        <p className={cn("text-[10px] font-black uppercase tracking-tight truncate", status.text === 'text-white' ? 'text-white/90' : 'text-slate-500')}>
                            {cita.service?.nombre || 'Servicio'}
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
                        {cita.estado === 'pending' && (
                            <div className="flex gap-1.5">
                                <button 
                                    onClick={(e) => { e.preventDefault(); onConfirm?.(cita.id); }}
                                    className="size-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-90 transition-transform"
                                >
                                    <Check size={16} strokeWidth={3} />
                                </button>
                                <button 
                                    onClick={(e) => { e.preventDefault(); onCancel?.(cita.id); }}
                                    className="size-9 rounded-2xl bg-white text-rose-500 border border-rose-100 flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                                >
                                    <X size={16} strokeWidth={3} />
                                </button>
                            </div>
                        )}
                        <div className="size-9 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-slate-400">
                            <MoreVertical size={16} />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white/40 p-1.5 rounded-2xl border border-white/20 backdrop-blur-sm">
                        <div className="size-5 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-slate-100">
                            {(cita.staff?.imageMedia || cita.staff?.avatar) ? (
                                <img src={getImageUrl(cita.staff.imageMedia || cita.staff.avatar, 'thumb')} className="w-full h-full object-cover" />
                            ) : (
                                <User size={10} className="text-slate-400" />
                            )}
                        </div>
                        <span className={cn("text-[8px] font-black uppercase tracking-widest italic", status.text === 'text-white' ? 'text-white' : 'text-slate-400')}>
                            {cita.staff?.name?.split(' ')[0] || 'Staff'}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default function MobileAgenda({ citas, primaryColor, onConfirm, onCancel, slug }: MobileAgendaProps) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [view, setView] = useState<'day' | 'week' | 'staff'>('week');

    const weekDays = useMemo(() => {
        const start = new Date(selectedDate);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(start.setDate(diff));
        
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
        });
    }, [selectedDate]);

    const navigateWeeks = (weeksOffset: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + weeksOffset * 7);
        setSelectedDate(newDate);
    };

    const hours = useMemo(() => {
        const start = setHours(startOfDay(new Date()), 7); // Empieza a las 7 AM
        const end = setHours(startOfDay(new Date()), 22); // Termina a las 10 PM
        return eachHourOfInterval({ start, end });
    }, []);

    const citasFiltradas = useMemo(() => {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        return citas.filter(c => {
            const d = new Date(c.fecha);
            // Extraer componentes UTC ya que el server guarda a medianoche UTC
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            const fechaStr = `${y}-${m}-${day}`;
            return fechaStr === selectedDateStr;
        });
    }, [citas, selectedDate]);

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-500 pb-20">
            {/* Header / Selector */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-100 p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CalendarIcon size={18} style={{ color: primaryColor }} />
                        <div className="flex items-center gap-0.5 bg-slate-50 rounded-xl p-0.5 border border-slate-100/60">
                            <button 
                                onClick={() => navigateWeeks(-1)}
                                className="p-1 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 active:scale-90 transition-all"
                            >
                                <ChevronLeft size={16} strokeWidth={3} />
                            </button>
                            <h2 className="text-[11px] font-black uppercase tracking-tighter italic text-slate-900 w-[95px] text-center select-none">
                                {format(selectedDate, 'MMM yyyy', { locale: es })}
                            </h2>
                            <button 
                                onClick={() => navigateWeeks(1)}
                                className="p-1 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 active:scale-90 transition-all"
                            >
                                <ChevronRight size={16} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 items-center gap-1">
                        {(['day', 'week', 'staff'] as const).map((v) => (
                            <button 
                                key={v}
                                onClick={() => setView(v)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                    view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                                )}
                            >
                                {v === 'day' ? 'Día' : v === 'week' ? 'Sem' : 'Prof'}
                            </button>
                        ))}
                        <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                        <Link 
                            href={`/${slug}`}
                            target="_blank"
                            className="size-8 rounded-lg flex items-center justify-center text-white transition-all active:scale-90"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Plus size={16} strokeWidth={3} />
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
                    {weekDays.map((date) => {
                        const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                        const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                        return (
                            <button 
                                key={date.toISOString()}
                                onClick={() => setSelectedDate(date)}
                                className={cn(
                                    "flex flex-col items-center min-w-[65px] py-4 rounded-[2rem] transition-all active:scale-95 border-2",
                                    isSelected ? "text-white shadow-2xl scale-105 z-10" : "bg-white text-slate-400 border-slate-50 shadow-sm"
                                )}
                                style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                            >
                                <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] mb-1", isSelected ? "opacity-70" : "text-slate-300")}>
                                    {format(date, 'EEE', { locale: es })}
                                </span>
                                <span className="text-xl font-black italic leading-none">{format(date, 'd')}</span>
                                {isToday && !isSelected && (
                                    <div className="mt-1 size-1 rounded-full bg-emerald-500" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {view === 'day' ? (
                    // VISTA DIARIA (TIMELINE)
                    hours.map((hour) => {
                        const citasEnHora = citasFiltradas.filter(c => {
                            const [h] = c.horaInicio.split(':');
                            return parseInt(h) === hour.getHours();
                        });

                        return (
                            <div key={hour.toISOString()} className="relative flex gap-4">
                                {/* Línea de hora actual */}
                                {format(new Date(), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && 
                                 hour.getHours() === new Date().getHours() && (
                                    <div 
                                        className="absolute left-[64px] right-0 h-0.5 z-20 pointer-events-none"
                                        style={{ 
                                            backgroundColor: primaryColor,
                                            top: `${(new Date().getMinutes() / 60) * 100}%` 
                                        }}
                                    >
                                        <div className="absolute -left-1 -top-1 size-2 rounded-full shadow-lg" style={{ backgroundColor: primaryColor }} />
                                    </div>
                                )}

                                {/* Time Label */}
                                <div className="w-12 pt-1">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter italic">
                                        {format(hour, 'HH:mm')}
                                    </span>
                                </div>

                                {/* Slot */}
                                <div className="flex-1 min-h-[100px] border-l border-slate-100 pl-4 space-y-3 relative">
                                    <div className="absolute inset-0 bg-slate-50/30 rounded-r-3xl -z-10" />
                                    {citasEnHora.length > 0 ? citasEnHora.map(cita => (
                                        <AppointmentCard 
                                            key={cita.id} 
                                            cita={cita} 
                                            primaryColor={primaryColor} 
                                            onConfirm={onConfirm} 
                                            onCancel={onCancel} 
                                        />
                                    )) : (
                                        <div className="h-full flex items-center">
                                            <div className="h-[1px] w-full bg-slate-100 border-t border-dashed" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : view === 'week' ? (
                    // VISTA SEMANAL (LISTA AGRUPADA DE LA SEMANA SELECCIONADA)
                    <div className="space-y-10">
                        {weekDays.map(date => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const citasDia = citas.filter(c => {
                                const d = new Date(c.fecha);
                                return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}` === dateStr;
                            });

                            if (citasDia.length === 0) return null;

                            return (
                                <div key={dateStr} className="space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="size-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 italic">
                                            {format(date, 'EEEE d MMMM', { locale: es })}
                                        </h3>
                                    </div>
                                    <div className="grid gap-3">
                                        {citasDia.map(cita => (
                                            <AppointmentCard 
                                                key={cita.id} 
                                                cita={cita} 
                                                primaryColor={primaryColor} 
                                                onConfirm={onConfirm} 
                                                onCancel={onCancel} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // VISTA PROFESIONAL (AGRUPADA POR STAFF)
                    <div className="space-y-10">
                        {Array.from(new Set(citasFiltradas.map(c => c.staff?.id))).map(staffId => {
                            const citasStaff = citasFiltradas.filter(c => c.staff?.id === staffId);
                            const staffName = citasStaff[0]?.staff?.name || 'Sin Asignar';
                            
                            return (
                                <div key={staffId || 'none'} className="space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="size-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase italic text-slate-900 leading-none">{staffName}</h3>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{citasStaff.length} Citas hoy</p>
                                        </div>
                                    </div>
                                    <div className="grid gap-3">
                                        {citasStaff.map(cita => (
                                            <AppointmentCard 
                                                key={cita.id} 
                                                cita={cita} 
                                                primaryColor={primaryColor} 
                                                onConfirm={onConfirm} 
                                                onCancel={onCancel} 
                                            />
                                        ))}
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
