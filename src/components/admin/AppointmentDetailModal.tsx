'use client';

import React, { useState, useEffect } from 'react';
import { 
    X, 
    Calendar, 
    Clock, 
    User, 
    Phone, 
    CreditCard, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    MessageCircle,
    MapPin,
    Hash,
    DollarSign,
    StickyNote,
    Zap,
    Save,
    Loader2,
    ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';

interface AppointmentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: any;
    onUpdateAppointment?: (appointment: any) => Promise<void>;
}

export default function AppointmentDetailModal({ 
    isOpen, 
    onClose, 
    appointment: initialAppointment,
    onUpdateAppointment 
}: AppointmentDetailModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<any>(null);

    useEffect(() => {
        if (initialAppointment) {
            setFormData({
                estado: initialAppointment.estado,
                pagoEstado: initialAppointment.pagoEstado || 'PENDIENTE',
                total: initialAppointment.total,
                pagoAnticipo: initialAppointment.pagoAnticipo || 0,
                metodoPago: initialAppointment.metodoPago || '',
                comentarios: initialAppointment.comentarios || '',
                pagoId: initialAppointment.pagoId || ''
            });
        }
    }, [initialAppointment]);

    if (!isOpen || !initialAppointment || !formData) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/appointments/${initialAppointment.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (res.ok) {
                const updated = await res.json();
                if (onUpdateAppointment) {
                    await onUpdateAppointment(updated.appointment);
                }
                onClose();
            }
        } catch (error) {
            console.error('Error saving appointment:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'approved':
            case 'confirmada':
                return {
                    bg: 'bg-emerald-500/10',
                    text: 'text-emerald-400',
                    border: 'border-emerald-500/20',
                    icon: <CheckCircle2 size={16} />,
                    label: 'Confirmada'
                };
            case 'client_checked_in':
                return {
                    bg: 'bg-amber-500/10',
                    text: 'text-amber-400',
                    border: 'border-amber-500/20',
                    icon: <User size={16} />,
                    label: 'En Sala de Espera'
                };
            case 'in_progress':
                return {
                    bg: 'bg-purple-500/10',
                    text: 'text-purple-400',
                    border: 'border-purple-500/20',
                    icon: <Zap size={16} />,
                    label: 'En Servicio'
                };
            case 'completed':
                return {
                    bg: 'bg-slate-500/10',
                    text: 'text-slate-400',
                    border: 'border-slate-500/20',
                    icon: <CheckCircle2 size={16} />,
                    label: 'Completada'
                };
            case 'no_show':
                return {
                    bg: 'bg-red-500/10',
                    text: 'text-red-400',
                    border: 'border-red-500/20',
                    icon: <XCircle size={16} />,
                    label: 'No se presentó'
                };
            case 'cancelled':
            case 'rejected':
                return {
                    bg: 'bg-rose-500/10',
                    text: 'text-rose-400',
                    border: 'border-rose-500/20',
                    icon: <XCircle size={16} />,
                    label: 'Cancelada'
                };
            case 'expired':
                return {
                    bg: 'bg-slate-500/10',
                    text: 'text-slate-400',
                    border: 'border-slate-500/20',
                    icon: <AlertCircle size={16} />,
                    label: 'Expirada'
                };
            default:
                return {
                    bg: 'bg-amber-500/10',
                    text: 'text-amber-400',
                    border: 'border-amber-500/20',
                    icon: <AlertCircle size={16} />,
                    label: 'Pendiente'
                };
        }
    };

    const statusInfo = getStatusStyles(formData.estado);

    // Acciones rápidas según el estado actual
    const quickActions = [
        { id: 'client_checked_in', label: 'Marcar Llegada', icon: <User size={14} />, color: 'amber', show: formData.estado === 'confirmed' },
        { id: 'in_progress', label: 'Iniciar Servicio', icon: <Zap size={14} />, color: 'purple', show: ['confirmed', 'client_checked_in'].includes(formData.estado) },
        { id: 'completed', label: 'Finalizar', icon: <CheckCircle2 size={14} />, color: 'emerald', show: formData.estado === 'in_progress' },
        { id: 'no_show', label: 'No se presentó', icon: <XCircle size={14} />, color: 'red', show: ['confirmed', 'client_checked_in'].includes(formData.estado) }
    ].filter(a => a.show);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl md:backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-5xl bg-slate-900 md:bg-premium-dark md:border md:border-white/10 md:rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
                
                {/* Header Section */}
                <div className="relative overflow-hidden shrink-0">
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-full">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] -mr-48 -mt-48 animate-pulse" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -ml-48 -mb-48" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900 md:to-premium-dark" />
                    </div>

                    <div className="relative z-10 px-6 py-6 md:px-10 md:py-8 flex items-start justify-between">
                        <div className="space-y-4">
                            <button 
                                onClick={onClose}
                                className="md:hidden flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
                            >
                                <ArrowLeft size={20} />
                                <span className="text-xs font-black uppercase tracking-widest">Cerrar</span>
                            </button>
                            
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
                                        Gestionar <span className="text-emerald-500">Cita</span>
                                    </h2>
                                    <div className={clsx(
                                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                        statusInfo.bg,
                                        statusInfo.text,
                                        statusInfo.border
                                    )}>
                                        {statusInfo.icon}
                                        {statusInfo.label}
                                    </div>
                                </div>
                                <p className="text-white/40 text-[10px] md:text-xs font-black uppercase tracking-[0.25em] flex items-center gap-2">
                                    <Hash size={12} className="text-emerald-500" />
                                    Referencia: {initialAppointment.id}
                                </p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={onClose}
                            className="hidden md:flex p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/10 active:scale-95 group"
                        >
                            <X size={24} className="group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-10 md:pb-10 custom-scrollbar relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
                        
                        {/* LEFT COLUMN: INFORMACIÓN Y ESTADO */}
                        <div className="lg:col-span-7 space-y-6 md:space-y-8">
                            
                            {/* Cliente Card */}
                            <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/5 border border-white/10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30 group-hover:rotate-6 transition-transform">
                                            <User size={28} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tight uppercase leading-none">{initialAppointment.cliente?.nombre}</h3>
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-2">Perfil del Cliente</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 flex items-center justify-between group/btn">
                                            <div className="flex items-center gap-3">
                                                <Phone size={18} className="text-emerald-500" />
                                                <span className="text-sm font-black text-white/80">{initialAppointment.cliente?.telefono}</span>
                                            </div>
                                            <a 
                                                href={`https://wa.me/${initialAppointment.cliente?.telefono?.replace(/\D/g, '')}`}
                                                target="_blank"
                                                className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all active:scale-90"
                                            >
                                                <MessageCircle size={18} fill="currentColor" />
                                            </a>
                                        </div>
                                        <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 flex items-center gap-3">
                                            <Calendar size={18} className="text-blue-400" />
                                            <div>
                                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Fecha de Cita</p>
                                                <p className="text-sm font-black text-white uppercase italic">
                                                    {format(new Date(initialAppointment.fecha), 'EEEE d MMMM', { locale: es })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Acciones Rápidas - Check-In System */}
                            {quickActions.length > 0 && (
                                <div className="space-y-4">
                                    <label className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em] px-4">Acciones de Servicio</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {quickActions.map(action => (
                                            <button
                                                key={action.id}
                                                onClick={() => setFormData({ ...formData, estado: action.id })}
                                                className={clsx(
                                                    "h-16 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest border transition-all active:scale-95",
                                                    `bg-${action.color}-500/10 text-${action.color}-400 border-${action.color}-500/20 hover:bg-${action.color}-500/20`
                                                )}
                                            >
                                                {action.icon}
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="text-xs font-black text-white/40 uppercase tracking-[0.3em] px-4">Todos los Estados</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { id: 'pending', label: 'Pendiente', color: 'amber' },
                                        { id: 'confirmed', label: 'Confirmada', color: 'emerald' },
                                        { id: 'client_checked_in', label: 'Llegó', color: 'amber' },
                                        { id: 'in_progress', label: 'En Servicio', color: 'purple' },
                                        { id: 'completed', label: 'Completada', color: 'slate' },
                                        { id: 'no_show', label: 'No Show', color: 'red' },
                                        { id: 'cancelled', label: 'Cancelada', color: 'rose' }
                                    ].map((s) => (
                                        <button
                                            key={s.id}
                                            onClick={() => setFormData({ ...formData, estado: s.id })}
                                            className={clsx(
                                                "py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-95",
                                                formData.estado === s.id 
                                                    ? `bg-${s.color}-500/20 text-${s.color}-400 border-${s.color}-500/50 shadow-lg shadow-${s.color}-500/10`
                                                    : "bg-white/5 text-white/30 border-white/10 hover:bg-white/10 hover:text-white/60"
                                            )}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Detalle del Servicio */}
                            <div className="p-8 rounded-[2.5rem] bg-slate-950 border border-white/5 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Detalle del Servicio</h4>
                                    <MapPin size={14} className="text-white/20" />
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                                            <Zap size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">
                                            {initialAppointment.service?.nombre || initialAppointment.nombreServicio || 'Servicio'}
                                        </p>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                                            {initialAppointment.staff?.name || 'Profesional no asignado'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Comentarios / Reseña Interna */}
                            <div className="space-y-4">
                                <label className="text-xs font-black text-white/40 uppercase tracking-[0.3em] px-4">Notas / Reseña Interna</label>
                                <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 focus-within:border-emerald-500/50 transition-all">
                                    <textarea 
                                        value={formData.comentarios}
                                        onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                                        className="w-full bg-transparent border-none p-0 text-white min-h-[120px] resize-none focus:ring-0 text-sm font-medium italic placeholder:text-white/10"
                                        placeholder="Escribe detalles internos, requisitos del cliente o notas de seguimiento..."
                                    />
                                    <div className="flex justify-end mt-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
                                            <StickyNote size={12} />
                                            Visible solo para el staff
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: GESTIÓN DE PAGOS */}
                        <div className="lg:col-span-5 space-y-8">
                            
                            {/* Panel de Pagos Premium */}
                            <div className="p-8 rounded-[3rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px] -mr-20 -mt-20" />
                                
                                <div className="relative z-10 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                                <DollarSign size={20} strokeWidth={3} />
                                            </div>
                                            <h3 className="font-black text-white italic tracking-tight uppercase leading-none">Caja y Cobro</h3>
                                        </div>
                                        <CreditCard size={20} className="text-white/20" />
                                    </div>

                                    <div className="space-y-6">
                                        {/* Total Input */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Total a Cobrar</label>
                                            <div className="relative group">
                                                <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500" size={24} />
                                                <input 
                                                    type="number"
                                                    value={formData.total}
                                                    onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                                                    className="w-full bg-slate-950/80 border border-white/10 h-20 pl-16 pr-8 rounded-3xl text-3xl font-black text-white italic tracking-tighter focus:border-emerald-500/50 focus:bg-slate-950 transition-all"
                                                />
                                            </div>
                                        </div>

                                        {/* Anticipo Input */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Anticipo / Depósito</label>
                                            <div className="relative group">
                                                <Zap className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-400" size={24} />
                                                <input 
                                                    type="number"
                                                    value={formData.pagoAnticipo}
                                                    onChange={(e) => setFormData({ ...formData, pagoAnticipo: e.target.value })}
                                                    className="w-full bg-slate-950/80 border border-white/10 h-20 pl-16 pr-8 rounded-3xl text-3xl font-black text-blue-400 italic tracking-tighter focus:border-blue-500/50 focus:bg-slate-950 transition-all"
                                                />
                                            </div>
                                            <div className="flex justify-between px-2">
                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Restante:</span>
                                                <span className="text-sm font-black text-emerald-500 italic">
                                                    ${(Math.max(0, formData.total - formData.pagoAnticipo)).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Metodo de Pago Select */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Método Sugerido</label>
                                            <select 
                                                value={formData.metodoPago}
                                                onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 h-16 px-6 rounded-2xl text-white font-black uppercase tracking-widest text-xs focus:border-emerald-500/50 transition-all appearance-none italic"
                                            >
                                                <option value="" className="bg-slate-900">Seleccionar...</option>
                                                <option value="EFECTIVO" className="bg-slate-900">Efectivo</option>
                                                <option value="TRANSFERENCIA" className="bg-slate-900">Transferencia</option>
                                                <option value="MERCADOPAGO" className="bg-slate-900">Mercado Pago</option>
                                                <option value="TARJETA" className="bg-slate-900">Tarjeta Crédito/Débito</option>
                                            </select>
                                        </div>

                                        {/* Estado de Pago */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Estado del Cobro</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { id: 'PENDIENTE', label: 'Pendiente', color: 'amber' },
                                                    { id: 'PAGADO', label: 'Pagado', color: 'emerald' },
                                                    { id: 'PARCIAL', label: 'Pago Parcial', color: 'blue' },
                                                    { id: 'REEMBOLSADO', label: 'Reembolso', color: 'rose' }
                                                ].map((p) => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => setFormData({ ...formData, pagoEstado: p.id })}
                                                        className={clsx(
                                                            "py-4 rounded-xl font-black text-[9px] uppercase tracking-widest border transition-all",
                                                            formData.pagoEstado === p.id 
                                                                ? `bg-${p.color}-500/20 text-${p.color}-400 border-${p.color}-500/40`
                                                                : "bg-white/5 text-white/20 border-white/5 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Info Adicional Footer */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-1">
                                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Creación</p>
                                    <p className="text-[10px] font-black text-white italic truncate">
                                        {format(new Date(initialAppointment.createdAt), 'd MMM, HH:mm')} hs
                                    </p>
                                </div>
                                <div className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-1">
                                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Duración Estimada</p>
                                    <p className="text-[10px] font-black text-white italic">
                                        {initialAppointment.duracion || 60} min
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Fix Bar */}
                <div className="shrink-0 p-6 md:p-8 bg-slate-950/80 md:bg-white/5 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between gap-4 relative z-50">
                    <div className="hidden md:flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Listo para procesar</span>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button 
                            onClick={onClose}
                            className="flex-1 md:flex-none px-8 py-5 md:py-4 bg-white/5 text-white/40 hover:text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-[2] md:flex-none px-12 py-5 md:py-4 bg-emerald-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-3"
                        >
                            {isSaving ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} strokeWidth={3} />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
