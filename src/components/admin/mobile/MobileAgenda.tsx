'use client';

import { useState, useMemo } from 'react';
import { format, addDays, startOfDay, eachHourOfInterval, setHours, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    ChevronLeft, 
    ChevronRight, 
    Plus, 
    Clock, 
    User as UserIcon, 
    Check, 
    X, 
    MoreVertical,
    Calendar as CalendarIcon,
    Search,
    MessageCircle,
    Phone,
    SlidersHorizontal,
    QrCode,
    Bell,
    CheckCircle2,
    AlertCircle,
    Sparkles
} from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import Link from 'next/link';
import AIAssistantDrawer from './AIAssistantDrawer';

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
                bg: 'bg-emerald-50/60', 
                text: 'text-emerald-600', 
                border: 'border-emerald-100',
                badgeBg: 'bg-emerald-100/60',
                accent: '#10b981'
            };
        case 'client_checked_in':
            return { 
                label: 'Llegó (Por Confirmar)', 
                bg: 'bg-amber-50/60', 
                text: 'text-amber-600', 
                border: 'border-amber-100',
                badgeBg: 'bg-amber-100/60',
                accent: '#f59e0b',
                animate: 'animate-pulse'
            };
        case 'in_progress':
            return { 
                label: 'En Proceso', 
                bg: 'bg-purple-50/60', 
                text: 'text-purple-600', 
                border: 'border-purple-100',
                badgeBg: 'bg-purple-100/60',
                accent: '#9333ea'
            };
        case 'completed':
            return { 
                label: 'Finalizada', 
                bg: 'bg-slate-50', 
                text: 'text-slate-500', 
                border: 'border-slate-200',
                badgeBg: 'bg-slate-200/60',
                accent: '#64748b'
            };
        case 'cancelled':
        case 'no_show':
            return { 
                label: s === 'no_show' ? 'No asistió' : 'Cancelada', 
                bg: 'bg-rose-50/60', 
                text: 'text-rose-500', 
                border: 'border-rose-100',
                badgeBg: 'bg-rose-100/60',
                accent: '#f43f5e'
            };
        case 'expired':
            return { 
                label: 'Expirada', 
                bg: 'bg-slate-50', 
                text: 'text-slate-400', 
                border: 'border-slate-100',
                badgeBg: 'bg-slate-100',
                accent: '#94a3b8'
            };
        default:
            return { 
                label: 'Pendiente', 
                bg: 'bg-amber-50/60', 
                text: 'text-amber-600', 
                border: 'border-amber-100',
                badgeBg: 'bg-amber-100/60',
                accent: '#fbbf24'
            };
    }
}

// Sub-componente para la tarjeta de cita rediseñada de lujo
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
    
    // Obtener imagen del servicio
    const serviceImage = (cita.service?.imagenes && cita.service.imagenes.length > 0)
        ? (typeof cita.service.imagenes === 'string' ? JSON.parse(cita.service.imagenes)[0]?.url : cita.service.imagenes[0]?.url)
        : (cita.service?.extraInfo?.imagenUrl || 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=150');

    // Teléfono de contacto del cliente
    const clientPhone = cita.cliente?.telefono || cita.Usuario?.telefono || "";
    const cleanPhone = clientPhone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("593") 
        ? cleanPhone 
        : cleanPhone.startsWith("0") 
            ? `593${cleanPhone.slice(1)}` 
            : `593${cleanPhone}`;
    const whatsappUrl = `https://wa.me/${formattedPhone}`;

    return (
        <div className="relative overflow-hidden rounded-[2.5rem] w-full bg-white border border-slate-100 shadow-sm flex items-stretch hover:shadow-md transition-shadow duration-300">
            {/* Indicador de estado lateral */}
            <div 
                className="w-2.5 shrink-0"
                style={{ backgroundColor: status.accent }}
            />

            <div className="flex-1 p-5 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                
                {/* Contenido Izquierda: Foto del servicio y Detalles */}
                <div className="flex items-start gap-4">
                    {/* Foto del servicio */}
                    <div className="size-20 rounded-2xl overflow-hidden shrink-0 border border-slate-100 bg-slate-50 relative">
                        <img 
                            src={serviceImage} 
                            alt={cita.service?.nombre || "Tratamiento"}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Textos y metadata */}
                    <div className="space-y-1.5 min-w-0">
                        {/* Fila superior: Hora y Duración */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span 
                                className="px-3 py-1 rounded-full text-[9px] font-black tracking-wider text-pink-500 bg-pink-50 uppercase"
                                style={{ color: primaryColor, backgroundColor: `color-mix(in srgb, ${primaryColor}, transparent 93%)` }}
                            >
                                {cita.horaInicio || "10:00 AM"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                <Clock size={10} /> {cita.service?.duracion || 60} min
                            </span>
                        </div>

                        {/* Nombre del servicio */}
                        <h4 className="text-sm font-black text-slate-900 leading-tight uppercase tracking-tight line-clamp-1">
                            {cita.service?.nombre || "Tratamiento Facial"}
                        </h4>

                        {/* Nombre del cliente */}
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <UserIcon size={12} className="text-slate-400 shrink-0" />
                            <span className="text-xs font-semibold truncate uppercase">
                                {cita.cliente?.nombre || cita.Usuario?.nombre || "Cliente Registrado"}
                            </span>
                        </div>

                        {/* Especialista/Staff asignado */}
                        <div className="flex items-center gap-2">
                            <div className="size-5 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                                {(cita.staff?.imageMedia || cita.staff?.avatar) ? (
                                    <img 
                                        src={getImageUrl(cita.staff.imageMedia || cita.staff.avatar, 'thumb')} 
                                        className="w-full h-full object-cover" 
                                    />
                                ) : (
                                    <UserIcon size={10} className="text-slate-400" />
                                )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[100px]">
                                {cita.staff?.name?.split(' ')[0] || "Especialista"}
                            </span>
                            <span 
                                className="px-2 py-0.5 rounded text-[7px] font-black uppercase text-pink-500 bg-pink-50 border shrink-0"
                                style={{ 
                                    color: primaryColor, 
                                    backgroundColor: `color-mix(in srgb, ${primaryColor}, transparent 93%)`,
                                    borderColor: `color-mix(in srgb, ${primaryColor}, transparent 88%)` 
                                }}
                            >
                                Especialista
                            </span>
                        </div>
                    </div>
                </div>

                {/* Acciones y Estado Derecha */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50 shrink-0">
                    
                    {/* Chip de estado */}
                    <div 
                        className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5",
                            status.text, status.border, status.badgeBg
                        )}
                    >
                        {cita.estado === 'confirmed' || cita.estado === 'approved' ? (
                            <CheckCircle2 size={10} className="stroke-[3]" />
                        ) : cita.estado === 'pending' ? (
                            <AlertCircle size={10} className="stroke-[3]" />
                        ) : null}
                        {status.label}
                    </div>

                    {/* Botones de acción directos */}
                    <div className="flex items-center gap-2">
                        {/* Botón Chat/WhatsApp */}
                        {clientPhone && (
                            <a 
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="size-9 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-emerald-500 border border-slate-150 rounded-full flex items-center justify-center transition-colors shadow-sm"
                            >
                                <MessageCircle size={16} className="stroke-[2.5]" />
                            </a>
                        )}

                        {/* Botón Llamar */}
                        {clientPhone && (
                            <a 
                                href={`tel:${clientPhone}`}
                                className="size-9 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-800 border border-slate-150 rounded-full flex items-center justify-center transition-colors shadow-sm"
                            >
                                <Phone size={16} className="stroke-[2.5]" />
                            </a>
                        )}

                        {/* Menú de Opciones */}
                        <Link
                            href={`/admin/citas/${cita.id}`}
                            className="size-9 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-800 border border-slate-150 rounded-full flex items-center justify-center transition-colors shadow-sm"
                        >
                            <MoreVertical size={16} className="stroke-[2.5]" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MobileAgenda({ citas, primaryColor, onConfirm, onCancel, onUpdateStatus, slug }: MobileAgendaProps) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [view, setView] = useState<'day' | 'week' | 'staff'>('week');
    const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'pending' | 'cancelled' | 'completed'>('all');
    const [showAI, setShowAI] = useState(false);

    // Generar carrusel de días (7 días centrados en la fecha seleccionada)
    const weekDays = useMemo(() => {
        const today = new Date();
        const start = new Date(selectedDate);
        // Centrar la semana seleccionada empezando desde el lunes
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(start.setDate(diff));
        
        return Array.from({ length: 7 }).map((_, i) => {
            return addDays(monday, i);
        });
    }, [selectedDate]);

    // Navegación de semanas
    const navigateWeeks = (weeksOffset: number) => {
        setSelectedDate(prev => addDays(prev, weeksOffset * 7));
    };

    // Estadísticas del día seleccionado (Métricas de la captura de pantalla)
    const stats = useMemo(() => {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        const citasHoy = citas.filter(c => {
            const d = new Date(c.fecha);
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${day}` === selectedDateStr;
        });

        const programadas = citasHoy.length;
        const confirmadas = citasHoy.filter(c => c.estado === 'confirmed' || c.estado === 'approved').length;
        const pendientes = citasHoy.filter(c => c.estado === 'pending').length;
        const finalizadas = citasHoy.filter(c => c.estado === 'completed').length;

        return { programadas, confirmadas, pendientes, finalizadas };
    }, [citas, selectedDate]);

    // Filtrar citas del día por estado seleccionado
    const citasFiltradas = useMemo(() => {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        return citas.filter(c => {
            // Validar fecha
            const d = new Date(c.fecha);
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            const fechaStr = `${y}-${m}-${day}`;
            if (fechaStr !== selectedDateStr) return false;

            // Validar estado
            if (filterStatus === 'all') return true;
            if (filterStatus === 'confirmed') return c.estado === 'confirmed' || c.estado === 'approved';
            if (filterStatus === 'pending') return c.estado === 'pending' || c.estado === 'client_checked_in';
            if (filterStatus === 'cancelled') return c.estado === 'cancelled' || c.estado === 'no_show';
            if (filterStatus === 'completed') return c.estado === 'completed';
            
            return true;
        }).sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));
    }, [citas, selectedDate, filterStatus]);

    return (
        <div className="flex flex-col min-h-screen bg-[#fafafc] animate-in fade-in duration-500 pb-24">
            
            {/* 2. Sección Título "Mi Agenda" con botón de creación */}
            <div className="px-6 py-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div 
                        className="size-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                        style={{ backgroundColor: `color-mix(in srgb, ${primaryColor}, transparent 90%)`, color: primaryColor }}
                    >
                        <CalendarIcon size={22} className="stroke-[2.5]" />
                    </div>
                    <div className="space-y-0.5">
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Mi Agenda</h2>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Gestiona todas las citas de tu negocio</p>
                    </div>
                </div>

                <Link
                    href={`/admin/citas/nueva`}
                    className="px-5 py-3 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest shadow-md flex items-center gap-1.5 hover:brightness-105 active:scale-[0.99] transition-all"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Plus size={12} strokeWidth={3} />
                    Nueva Cita
                </Link>
            </div>

            {/* 3. Barra de navegación y días del calendario */}
            <div className="px-6 space-y-4">
                
                {/* Controles de vista y mes */}
                <div className="flex items-center justify-between gap-4">
                    {/* Selector de Mes */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                        <button 
                            onClick={() => navigateWeeks(-1)}
                            className="size-8 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors"
                        >
                            <ChevronLeft size={16} strokeWidth={2.5} />
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 w-[110px] text-center">
                            {format(selectedDate, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button 
                            onClick={() => navigateWeeks(1)}
                            className="size-8 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors"
                        >
                            <ChevronRight size={16} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Selector de Vista (Día / Semana / Profesional) */}
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm items-center">
                        {(['day', 'week', 'staff'] as const).map((v) => {
                            const isSel = view === v;
                            return (
                                <button 
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={cn(
                                        "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                        isSel 
                                            ? "text-white shadow-sm" 
                                            : "text-slate-400 hover:text-slate-600"
                                    )}
                                    style={isSel ? { backgroundColor: primaryColor } : {}}
                                >
                                    {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Profesional'}
                                </button>
                            );
                        })}
                        <div className="w-[1px] h-4 bg-slate-200 mx-2" />
                        <button className="size-8 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors">
                            <SlidersHorizontal size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Fila de días de la semana */}
                <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((date) => {
                        const isSelected = isSameDay(date, selectedDate);
                        const isToday = isSameDay(date, new Date());
                        
                        return (
                            <button 
                                key={date.toISOString()}
                                onClick={() => setSelectedDate(date)}
                                className={cn(
                                    "flex flex-col items-center py-3 rounded-2xl transition-all relative border border-slate-100",
                                    isSelected 
                                        ? "text-white shadow-lg z-10 scale-102" 
                                        : "bg-white text-slate-800 hover:bg-slate-50"
                                )}
                                style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                            >
                                <span className={cn("text-[8px] font-black uppercase tracking-wider mb-1", isSelected ? "text-white/80" : "text-slate-400")}>
                                    {format(date, 'EEE', { locale: es }).slice(0, 3)}
                                </span>
                                <span className="text-base font-black leading-none">{format(date, 'd')}</span>
                                {isToday && !isSelected && (
                                    <div className="absolute bottom-1.5 size-1 rounded-full bg-pink-500" />
                                )}
                                {isSelected && (
                                    <div className="absolute bottom-1 size-1 rounded-full bg-white" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 4. Métricas / Tarjetas superiores del día (Métricas de la captura) */}
            <div className="px-6 pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Programadas */}
                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center shrink-0">
                        <CalendarIcon size={16} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-base font-black text-slate-800 leading-none">{stats.programadas}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 leading-tight">Citas hoy Programadas</p>
                    </div>
                </div>

                {/* Confirmadas */}
                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center shrink-0">
                        <Clock size={16} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-base font-black text-slate-800 leading-none">{stats.confirmadas}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 leading-tight">Confirmadas hoy</p>
                    </div>
                </div>

                {/* Pendientes */}
                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                        <Clock size={16} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-base font-black text-slate-800 leading-none">{stats.pendientes}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 leading-tight">Pendientes por confirmar</p>
                    </div>
                </div>

                {/* Finalizadas */}
                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
                        <Check size={16} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-base font-black text-slate-800 leading-none">{stats.finalizadas}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 leading-tight">Finalizadas hoy</p>
                    </div>
                </div>
            </div>

            {/* 5. Filtros de estado / Pestañas de la lista */}
            <div className="px-6 pt-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar flex-1 -mx-6 px-6">
                    {[
                        { id: 'all', label: 'Todas' },
                        { id: 'confirmed', label: 'Confirmadas' },
                        { id: 'pending', label: 'Pendientes' },
                        { id: 'cancelled', label: 'Canceladas' },
                        { id: 'completed', label: 'Finalizadas' }
                    ].map((opt) => {
                        const isSel = filterStatus === opt.id;
                        return (
                            <button
                                key={opt.id}
                                onClick={() => setFilterStatus(opt.id as any)}
                                className={cn(
                                    "px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border active:scale-95",
                                    isSel 
                                        ? "bg-pink-50 text-pink-500 border-pink-100 shadow-inner" 
                                        : "bg-white text-slate-400 border-slate-100 hover:text-slate-600"
                                )}
                                style={isSel ? { 
                                    color: primaryColor, 
                                    backgroundColor: `color-mix(in srgb, ${primaryColor}, transparent 93%)`,
                                    borderColor: `color-mix(in srgb, ${primaryColor}, transparent 85%)` 
                                } : {}}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
                
                <button className="size-9 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 shadow-sm shrink-0">
                    <Search size={16} strokeWidth={2.5} />
                </button>
            </div>

            {/* 6. Listado de Citas del Día */}
            <div className="px-6 pt-6 space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <div className="size-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                        {format(selectedDate, 'EEEE d MMMM', { locale: es })}
                    </span>
                </div>

                <div className="space-y-4">
                    {citasFiltradas.length > 0 ? (
                        citasFiltradas.map((cita) => (
                            <AppointmentCard 
                                key={cita.id}
                                cita={cita}
                                primaryColor={primaryColor}
                                onConfirm={onConfirm}
                                onCancel={onCancel}
                                onUpdateStatus={onUpdateStatus}
                            />
                        ))
                    ) : (
                        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 text-center space-y-3 shadow-inner">
                            <CalendarIcon size={32} className="text-slate-300 mx-auto" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No hay servicios agendados</p>
                            <p className="text-[10px] text-slate-400 font-semibold max-w-[200px] mx-auto leading-relaxed">
                                Intenta seleccionar otro filtro o agenda una nueva cita para este día.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* 7. Botón flotante Asistente IA */}
            <div className="fixed bottom-24 right-6 z-40">
                <button 
                    onClick={() => setShowAI(true)}
                    className="relative px-5 py-3.5 text-white rounded-full shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 font-black text-[9px] uppercase tracking-widest border border-white/20 hover:shadow-2xl"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, #ec4899)` }}
                >
                    <Sparkles size={12} className="animate-pulse" />
                    Asistente IA
                    <span className="absolute -top-1 -right-1 size-3 bg-emerald-400 rounded-full border-2 border-white" />
                </button>
            </div>

            {/* Drawer de Asistente IA */}
            <AIAssistantDrawer
                open={showAI}
                onClose={() => setShowAI(false)}
                primaryColor={primaryColor}
                citas={citas}
                selectedDate={selectedDate}
                stats={stats}
                negocio={slug}
            />
        </div>
    );
}
