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
    onUpdateStatus?: (id: string, nuevoEstado: string) => void;
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

// Sub-componente para la tarjeta de cita con soporte para Swipe Gestures (deslizar)
function AppointmentCard({ 
    cita, 
    primaryColor, 
    onUpdateStatus, 
    onConfirm, 
    onCancel 
}: { 
    cita: any; 
    primaryColor: string; 
    onUpdateStatus?: (id: string, nuevoEstado: string) => void; 
    onConfirm?: any; 
    onCancel?: any; 
}) {
    const status = getStatusConfig(cita.estado, primaryColor);
    
    // Estados para controlar el deslizamiento horizontal
    const [startX, setStartX] = useState(0);
    const [translateX, setTranslateX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // Determinar las acciones a la izquierda/derecha
    const getSwipeActions = () => {
        const est = cita.estado?.toLowerCase();
        let rightAction = null; // Confirmar/Llegó/Finalizar
        let leftAction = null;  // Cancelar/Rechazar

        if (est === 'completed' || est === 'cancelled' || est === 'expired') {
            return { rightAction, leftAction };
        }

        // Deslizar izquierda -> Cancelar
        leftAction = {
            estado: 'cancelled',
            label: est === 'pending' ? 'Rechazar' : 'Cancelar',
            bg: 'bg-rose-600',
            icon: <X size={20} strokeWidth={3} className="text-white shrink-0" />
        };

        // Deslizar derecha -> Avance lógico
        if (est === 'pending') {
            rightAction = {
                estado: 'confirmed',
                label: 'Confirmar',
                bg: 'bg-emerald-600',
                icon: <Check size={20} strokeWidth={3} className="text-white shrink-0" />
            };
        } else if (est === 'confirmed' || est === 'approved') {
            rightAction = {
                estado: 'client_checked_in',
                label: 'Asistencia (Llegó)',
                bg: 'bg-amber-500',
                icon: <Check size={20} strokeWidth={3} className="text-white shrink-0" />
            };
        } else if (est === 'client_checked_in') {
            rightAction = {
                estado: 'in_progress',
                label: 'Iniciar Servicio',
                bg: 'bg-purple-600',
                icon: <Check size={20} strokeWidth={3} className="text-white shrink-0" />
            };
        } else if (est === 'in_progress') {
            rightAction = {
                estado: 'completed',
                label: 'Finalizar',
                bg: 'bg-slate-700',
                icon: <Check size={20} strokeWidth={3} className="text-white shrink-0" />
            };
        }

        return { rightAction, leftAction };
    };

    const { rightAction, leftAction } = getSwipeActions();

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!rightAction && !leftAction) return;
        setStartX(e.touches[0].clientX);
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const diffX = e.touches[0].clientX - startX;
        
        // Bloquear si no hay acción disponible en la dirección del arrastre
        if (diffX > 0 && !rightAction) {
            setTranslateX(0);
            return;
        }
        if (diffX < 0 && !leftAction) {
            setTranslateX(0);
            return;
        }

        // Añadir efecto de resistencia física
        const maxDrag = 140;
        let finalTranslate = diffX;
        if (Math.abs(diffX) > maxDrag) {
            const excess = Math.abs(diffX) - maxDrag;
            finalTranslate = (diffX > 0 ? maxDrag : -maxDrag) + (diffX > 0 ? 1 : -1) * (excess * 0.25);
        }

        setTranslateX(finalTranslate);
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);

        const threshold = 100;
        if (translateX > threshold && rightAction) {
            if (onUpdateStatus) {
                onUpdateStatus(cita.id, rightAction.estado);
            } else if (rightAction.estado === 'confirmed' && onConfirm) {
                onConfirm(cita.id);
            }
        } else if (translateX < -threshold && leftAction) {
            if (onUpdateStatus) {
                onUpdateStatus(cita.id, leftAction.estado);
            } else if (onCancel) {
                onCancel(cita.id);
            }
        }

        setTranslateX(0);
    };

    return (
        <div className="relative overflow-hidden rounded-[2.5rem] w-full bg-slate-100 shadow-sm border border-slate-200/50">
            {/* Fondo de acción a la derecha (Confirmar / Avanzar) */}
            {rightAction && translateX > 0 && (
                <div 
                    className={cn("absolute inset-y-0 left-0 flex items-center pl-6 gap-3 transition-opacity", rightAction.bg)}
                    style={{ right: '50%', opacity: Math.min(1, translateX / 80) }}
                >
                    {rightAction.icon}
                    <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{rightAction.label}</span>
                </div>
            )}

            {/* Fondo de acción a la izquierda (Rechazar / Cancelar) */}
            {leftAction && translateX < 0 && (
                <div 
                    className={cn("absolute inset-y-0 right-0 flex items-center justify-end pr-6 gap-3 transition-opacity", leftAction.bg)}
                    style={{ left: '50%', opacity: Math.min(1, Math.abs(translateX) / 80) }}
                >
                    <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{leftAction.label}</span>
                    {leftAction.icon}
                </div>
            )}

            {/* Tarjeta deslizable */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ 
                    transform: `translateX(${translateX}px)`,
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="relative z-10 w-full"
            >
                <Link 
                    href={`/admin/citas/${cita.id}`}
                    className={cn(
                        "block p-5 rounded-[2.5rem] border shadow-inner overflow-hidden group active:scale-[0.98] transition-all bg-white",
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
            </div>
        </div>
    );
}

export default function MobileAgenda({ citas, primaryColor, onConfirm, onCancel, onUpdateStatus, slug }: MobileAgendaProps) {
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

    const [filterStatus, setFilterStatus] = useState<'active' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'all'>('active');

    const citasPorEstado = useMemo(() => {
        return citas.filter(res => {
            switch (filterStatus) {
                case 'active':
                    return res.estado === 'pending' || res.estado === 'confirmed' || res.estado === 'approved' || res.estado === 'client_checked_in' || res.estado === 'in_progress';
                case 'pending':
                    return res.estado === 'pending';
                case 'confirmed':
                    return res.estado === 'confirmed' || res.estado === 'approved';
                case 'completed':
                    return res.estado === 'completed';
                case 'cancelled':
                    return res.estado === 'cancelled' || res.estado === 'no_show';
                case 'all':
                default:
                    return true;
            }
        });
    }, [citas, filterStatus]);

    const citasFiltradas = useMemo(() => {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        return citasPorEstado.filter(c => {
            const d = new Date(c.fecha);
            // Extraer componentes UTC ya que el server guarda a medianoche UTC
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            const fechaStr = `${y}-${m}-${day}`;
            return fechaStr === selectedDateStr;
        }).sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));
    }, [citasPorEstado, selectedDate]);

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

                {/* Selector de Estado Horizontal (Filtros) */}
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1 pt-1 border-t border-slate-100/60">
                    {[
                        { id: 'active', label: 'Activas' },
                        { id: 'pending', label: 'Pendientes' },
                        { id: 'confirmed', label: 'Confirmadas' },
                        { id: 'completed', label: 'Finalizadas' },
                        { id: 'cancelled', label: 'Canceladas' },
                        { id: 'all', label: 'Ver Todo' }
                    ].map((opt) => {
                        const isSel = filterStatus === opt.id;
                        return (
                            <button
                                key={opt.id}
                                onClick={() => setFilterStatus(opt.id as any)}
                                className={cn(
                                    "px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border active:scale-95",
                                    isSel 
                                        ? "text-white border-transparent shadow-sm" 
                                        : "bg-slate-50 text-slate-400 border-slate-100/80 hover:text-slate-600"
                                )}
                                style={isSel ? { backgroundColor: primaryColor } : {}}
                            >
                                {opt.label}
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
                                            onUpdateStatus={onUpdateStatus}
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
                            const citasDia = citasPorEstado.filter(c => {
                                const d = new Date(c.fecha);
                                return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}` === dateStr;
                            }).sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));

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
                                                onUpdateStatus={onUpdateStatus}
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
                                                onUpdateStatus={onUpdateStatus}
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
