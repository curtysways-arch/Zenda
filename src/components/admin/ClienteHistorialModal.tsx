'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Scissors, User, Sparkles, DollarSign, Loader2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';

interface Cita {
    id: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    estado: string;
    total: number;
    clienteId: string;
    service?: {
        nombre: string;
    };
    staff?: {
        name: string;
    };
    pagoReserva?: any[];
}

interface ClienteHistorialModalProps {
    isOpen: boolean;
    onClose: () => void;
    cliente: {
        id: string;
        nombre: string;
        telefono: string;
    } | null;
}

export default function ClienteHistorialModal({ 
    isOpen, 
    onClose, 
    cliente 
}: ClienteHistorialModalProps) {
    const [citas, setCitas] = useState<Cita[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen || !cliente) return;

        const loadHistorial = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch('/api/appointments/list');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        // Filtrar citas del cliente actual
                        const clientCitas = data.filter((c: any) => c.clienteId === cliente.id);
                        setCitas(clientCitas);
                    } else {
                        setError('La respuesta del servidor no tiene el formato correcto.');
                    }
                } else {
                    setError('Error al obtener el historial de citas.');
                }
            } catch (err) {
                setError('Error de conexión con el servidor.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadHistorial();
    }, [isOpen, cliente]);

    if (!isOpen || !cliente) return null;

    // Colores estéticos para los badges de estado
    const getStatusBadge = (estado: string) => {
        const est = estado.toLowerCase();
        
        switch (est) {
            case 'confirmed':
            case 'confirmada':
                return { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20', label: 'Confirmada' };
            case 'pending':
            case 'pendiente':
                return { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20', label: 'Pendiente' };
            case 'completed':
            case 'finalizada':
                return { bg: 'bg-slate-50 dark:bg-white/5', text: 'text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/5', label: 'Finalizada' };
            case 'in_progress':
            case 'llego':
                return { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20', label: 'Llegó' };
            case 'client_checked_in':
                return { bg: 'bg-rose-50 dark:bg-rose-500/10 animate-pulse', text: 'text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20', label: 'Llegó (Por Confirmar)' };
            case 'cancelled':
            case 'cancelada':
                return { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20', label: 'Cancelada' };
            case 'no_show':
                return { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20', label: 'Ausente' };
            default:
                return { bg: 'bg-slate-50 dark:bg-white/5', text: 'text-slate-600 dark:text-slate-400 border border-slate-100', label: estado };
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Backdrop con blur */}
            <div 
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500" 
                onClick={onClose} 
            />
            
            {/* Contenedor del Modal */}
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-slate-100 dark:border-white/5 max-h-[85vh] flex flex-col">
                {/* Decorative top bar */}
                <div className="h-2 w-full bg-gradient-to-r from-[var(--primary-color,#0ea5e9)] to-sky-600" />
                
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all rounded-full hover:bg-slate-100 dark:hover:bg-white/5 active:scale-90 z-20"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="p-8 pb-4 space-y-2 border-b border-slate-50 dark:border-white/5 shrink-0">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic leading-none">
                        Historial de <span className="text-[var(--primary-color,#0ea5e9)]">Citas</span>
                    </h2>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-1.5 leading-none">
                        Cliente: <span className="text-slate-800 dark:text-slate-200 font-black">{cliente.nombre}</span> 
                        <span className="text-slate-300 dark:text-slate-700">|</span> 
                        <span>{cliente.telefono}</span>
                    </p>
                </div>

                {/* Citas List (Scrollable) */}
                <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="animate-spin text-[var(--primary-color,#0ea5e9)] mb-4" size={32} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando Historial...</p>
                        </div>
                    ) : error ? (
                        <div className="p-6 bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10 rounded-[2rem] text-center">
                            <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest">{error}</p>
                        </div>
                    ) : citas.length === 0 ? (
                        <div className="py-16 text-center space-y-4">
                            <div className="size-16 bg-slate-100 dark:bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto text-slate-300">
                                <Calendar size={28} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Este cliente no registra citas aún</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {citas.map((cita) => {
                                const badge = getStatusBadge(cita.estado);
                                const fechaCita = new Date(cita.fecha);
                                const fechaLegible = isNaN(fechaCita.getTime()) 
                                    ? cita.fecha 
                                    : format(fechaCita, "EEEE d 'de' MMMM, yyyy", { locale: es });

                                return (
                                    <div 
                                        key={cita.id}
                                        className="bg-white dark:bg-slate-900/60 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex gap-4 items-center">
                                                <div className="size-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 shadow-inner">
                                                    <Scissors size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm leading-tight">
                                                        {cita.service?.nombre || 'Servicio'}
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                                                        <User size={12} className="text-[var(--primary-color,#0ea5e9)]" />
                                                        Especialista: <span className="font-black text-slate-600 dark:text-slate-400">{cita.staff?.name || 'Profesional'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <span className={clsx("px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest", badge.bg, badge.text)}>
                                                {badge.label}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-50 dark:border-white/5">
                                            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span className="font-bold capitalize">{fechaLegible}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                                                <Clock size={14} className="text-slate-400" />
                                                <span className="font-bold">{cita.horaInicio} - {cita.horaFin}</span>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-50 dark:border-white/5 flex justify-between items-center">
                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                                                ID: {cita.id.slice(0, 8).toUpperCase()}
                                            </span>
                                            <div className="flex items-center gap-1 text-[var(--primary-color,#0ea5e9)]">
                                                <DollarSign size={14} />
                                                <span className="text-sm font-black italic">{cita.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-50 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-slate-900/60 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-95 transition-all active:scale-95 shadow-lg"
                    >
                        Cerrar Historial
                    </button>
                </div>
            </div>
        </div>
    );
}
