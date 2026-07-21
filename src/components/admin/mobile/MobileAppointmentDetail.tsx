'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    Calendar, 
    Clock, 
    User, 
    Phone, 
    MapPin, 
    ChevronLeft, 
    CheckCircle2, 
    XCircle, 
    Clock3, 
    DollarSign, 
    MessageSquare, 
    Zap,
    CreditCard,
    Plus,
    History,
    FileText,
    Bell,
    Check,
    Sparkles,
    MoreVertical,
    ArrowLeft
} from 'lucide-react';
import { cn, getImageUrl, toLocalDateFromUTC } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MobileAppointmentDetailProps {
    reserva: any;
    primaryColor: string;
    onStatusUpdate: (status: string) => void;
    onAddPayment: () => void;
    sendWhatsApp: (type: 'reminder' | 'debt') => void;
}

export default function MobileAppointmentDetail({ 
    reserva, 
    primaryColor, 
    onStatusUpdate, 
    onAddPayment,
    sendWhatsApp 
}: MobileAppointmentDetailProps) {
    const router = useRouter();
    const totalPagado = reserva.pagos?.reduce((acc: number, p: any) => acc + (p.monto || 0), 0) || 0;
    const deudaPendiente = Math.max(0, reserva.total - totalPagado);

    const statusConfig = {
        pending: { label: 'POR CONFIRMAR', color: 'bg-amber-50 text-amber-600 border-amber-100' },
        confirmed: { label: 'CONFIRMADA', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        approved: { label: 'CONFIRMADA', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        client_checked_in: { label: 'EN ESPERA', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
        in_progress: { label: 'EN SERVICIO', color: 'bg-purple-50 text-purple-600 border-purple-100' },
        completed: { label: 'FINALIZADA', color: 'bg-slate-900 text-white border-slate-900' },
        cancelled: { label: 'CANCELADA', color: 'bg-rose-50 text-rose-600 border-rose-100' },
        expired: { label: 'EXPIRADA', color: 'bg-slate-100 text-slate-500 border-slate-200' },
    };

    const currentStatus = (statusConfig as any)[reserva.estado] || { label: reserva.estado?.toUpperCase() || 'DESCONOCIDO', color: 'bg-slate-100 text-slate-500 border-slate-200' };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 animate-in fade-in duration-500 pb-32">
            {/* 🔝 COMPACT TOP NAV */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                <button onClick={() => router.back()} className="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Ficha Operativa</span>
                    <span className="text-[10px] font-black text-slate-900 uppercase italic">ID: #{reserva.id.slice(-8)}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => sendWhatsApp('reminder')} className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <Bell size={18} />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* 👤 COMPACT CLIENT & STATUS HEADER */}
                <div className="bg-white rounded-3xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm">
                    <div className="size-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-2xl font-black italic shrink-0 shadow-lg shadow-slate-200">
                        {reserva.cliente.nombre.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-black text-slate-900 uppercase italic truncate leading-none mb-2">
                            {reserva.cliente.nombre}
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className={cn("px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border shrink-0", currentStatus.color)}>
                                {currentStatus.label}
                            </div>
                            <a href={`tel:${reserva.cliente.telefono}`} className="text-[9px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md">
                                <Phone size={8} /> {reserva.cliente.telefono}
                            </a>
                        </div>
                    </div>
                </div>

                {/* 🧾 DESGLOSE DE SERVICIOS (ESTILO LISTADO) */}
                <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                            <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic">Detalle de la Cita</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight leading-none">{format(toLocalDateFromUTC(reserva.fecha), 'EEEE d MMMM', { locale: es })}</p>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-1">{reserva.horaInicio} HS</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Servicio Principal */}
                        <div className="flex items-center gap-4">
                            <div className="size-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 shadow-inner">
                                {(reserva.service?.imageMedia || reserva.service?.imagenes?.[0]?.url || reserva.service?.Imagen?.[0]?.url) ? (
                                    <img 
                                        src={getImageUrl(reserva.service.imageMedia || reserva.service?.imagenes?.[0]?.url || reserva.service?.Imagen?.[0]?.url, 'thumb')} 
                                        alt={reserva.service.nombre}
                                        className="w-full h-full object-cover scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                        <Sparkles size={20} />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-slate-900 uppercase truncate italic tracking-tight">{reserva.service?.nombre || reserva.nombreServicio}</p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Servicio Base • {reserva.staff?.name || 'Profesional'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-slate-900 italic tracking-tighter">
                                    ${reserva.precioOriginal || (reserva.total - (Array.isArray(reserva.extraServices) ? reserva.extraServices.reduce((acc: number, s: any) => acc + (s.precio || 0), 0) : 0))}
                                </p>
                            </div>
                        </div>

                        {/* Servicios Extra con Miniaturas/Iconos */}
                        {reserva.extraServices && Array.isArray(reserva.extraServices) && reserva.extraServices.map((extra: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 group">
                                <div className="size-14 rounded-2xl bg-emerald-50/50 flex items-center justify-center text-emerald-500 border border-emerald-100/50 shrink-0 group-hover:bg-emerald-100 transition-colors">
                                    <Plus size={20} strokeWidth={3} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-slate-900 uppercase truncate italic tracking-tight">{extra.nombre}</p>
                                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Adicional Seleccionado</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-slate-900 italic tracking-tighter">${extra.precio || 0}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* SECCIÓN TOTAL INTEGRADA */}
                    <div className="pt-6 border-t-2 border-dashed border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-slate-900 uppercase italic">Total Servicios</p>
                            <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mt-1">IVA e insumos incluidos</p>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-black text-slate-900 italic tracking-tighter leading-none">${reserva.total}</p>
                            { (reserva.estado === 'confirmed' || reserva.estado === 'approved') ? (
                                <div className="mt-1 bg-emerald-50 text-emerald-600 text-[7px] font-black uppercase px-2 py-0.5 rounded-full inline-block border border-emerald-100">Cita Confirmada</div>
                            ) : reserva.estado === 'pending' ? (
                                <div className="mt-1 bg-amber-50 text-amber-600 text-[7px] font-black uppercase px-2 py-0.5 rounded-full inline-block border border-amber-100">Cita por Confirmar</div>
                            ) : reserva.estado === 'expired' ? (
                                <div className="mt-1 bg-slate-100 text-slate-500 text-[7px] font-black uppercase px-2 py-0.5 rounded-full inline-block border border-slate-200">Cita Expirada</div>
                            ) : reserva.estado === 'cancelled' ? (
                                <div className="mt-1 bg-rose-50 text-rose-600 text-[7px] font-black uppercase px-2 py-0.5 rounded-full inline-block border border-rose-100">Cita Cancelada</div>
                            ) : (
                                <div className={cn("mt-1 text-[7px] font-black uppercase px-2 py-0.5 rounded-full inline-block border", currentStatus.color)}>{currentStatus.label}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 💰 COMPACT FINANCIAL GRID */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[8px] font-black text-slate-300 uppercase italic">Valor Total</p>
                            <CreditCard size={12} className="text-slate-200" />
                        </div>
                        <p className="text-3xl font-black text-slate-900 italic tracking-tighter">${reserva.total}</p>
                        <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Precio Final</span>
                    </div>
                    
                    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[8px] font-black text-slate-300 uppercase italic">Cobrado</p>
                            <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        </div>
                        <p className="text-3xl font-black text-emerald-600 italic tracking-tighter">${totalPagado}</p>
                    </div>
                </div>

                {/* Saldo Pendiente Alert (Only if exists) */}
                {deudaPendiente > 0 && (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-2">
                            <DollarSign size={14} className="text-amber-600" />
                            <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest">Saldo Pendiente:</span>
                        </div>
                        <span className="text-xl font-black text-amber-600 italic tracking-tighter">${deudaPendiente}</span>
                    </div>
                )}

                {/* 🚀 QUICK ACTIONS SECTION */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">Protocolo Operativo</h3>
                        <Zap size={14} className="text-slate-200" />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2.5">
                        {reserva.estado === 'pending' && (
                            <button onClick={() => onStatusUpdate('confirmed')} className="flex items-center justify-between p-5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl font-black uppercase italic tracking-widest text-[11px] active:scale-95 transition-all">
                                Confirmar Reserva
                                <CheckCircle2 size={16} />
                            </button>
                        )}

                        {reserva.estado === 'expired' && (
                            <button onClick={() => onStatusUpdate('pending')} className="flex items-center justify-between p-5 bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-black uppercase italic tracking-widest text-[11px] active:scale-95 transition-all">
                                Reactivar Reserva (Poner Pendiente)
                                <History size={16} />
                            </button>
                        )}

                        {(reserva.estado === 'confirmed' || reserva.estado === 'approved' || reserva.estado === 'pending') && (
                            <button onClick={() => onStatusUpdate('client_checked_in')} className="flex items-center justify-between p-5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl font-black uppercase italic tracking-widest text-[11px] active:scale-95 transition-all">
                                Marcar Llegada
                                <Zap size={16} />
                            </button>
                        )}

                        {reserva.estado === 'client_checked_in' && (
                            <button onClick={() => onStatusUpdate('in_progress')} className="flex items-center justify-between p-5 bg-purple-50 border border-purple-100 text-purple-700 rounded-2xl font-black uppercase italic tracking-widest text-[11px] active:scale-95 transition-all">
                                Iniciar Servicio
                                <Sparkles size={16} />
                            </button>
                        )}

                        {reserva.estado === 'in_progress' && (
                            <button onClick={() => onStatusUpdate('completed')} className="flex items-center justify-between p-5 bg-slate-900 text-white border border-slate-900 rounded-2xl font-black uppercase italic tracking-widest text-[11px] active:scale-95 transition-all shadow-xl shadow-slate-200">
                                Finalizar Cita
                                <CheckCircle2 size={16} />
                            </button>
                        )}

                        {reserva.estado !== 'completed' && reserva.estado !== 'cancelled' && (
                            <button onClick={() => onStatusUpdate('cancelled')} className="flex items-center justify-between px-5 py-3 text-slate-300 font-black uppercase tracking-widest text-[8px] active:scale-95 transition-all mt-2">
                                Cancelar Cita
                                <XCircle size={14} />
                            </button>
                        )}

                        {reserva.estado === 'cancelled' && (
                            <button onClick={() => onStatusUpdate('pending')} className="flex items-center justify-between p-5 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl font-black uppercase italic tracking-widest text-[11px] active:scale-95 transition-all">
                                Restaurar Cita
                                <History size={16} />
                            </button>
                        )}

                        {reserva.estado === 'completed' && (
                             <div className="py-6 text-center space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Cita Finalizada Exitosamente</p>
                             </div>
                        )}
                    </div>
                </div>

                {/* 👥 INFORMACIÓN DE REFERIDOS (INCENTIVO) */}
                {reserva.referralInfo && (
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 rounded-3xl p-5 space-y-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-800">
                                <Sparkles size={16} className="text-amber-500 fill-amber-500/20" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] italic">Premio de Referido</h4>
                            </div>
                            <span className="bg-amber-800/10 text-amber-800 text-[7px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-800/20">Invitado/a</span>
                        </div>
                        
                        <div className="space-y-1">
                            <p className="text-[9px] font-bold text-amber-800/60 uppercase tracking-wide">
                                Recomendado/a por: <strong className="text-amber-900 font-black">{reserva.referralInfo.referidorNombre}</strong>
                            </p>
                            <div className="bg-white/80 backdrop-blur-sm border border-amber-200/30 rounded-2xl p-3 flex items-center justify-between mt-2">
                                <div>
                                    <p className="text-[8px] font-black text-amber-800/50 uppercase tracking-widest">Beneficio a entregar:</p>
                                    <p className="text-sm font-black text-amber-950 italic mt-0.5 leading-none">{reserva.referralInfo.valorIncentivo}</p>
                                </div>
                                <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg italic shadow-md shadow-amber-500/10">🎁</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 📝 COMPACT NOTES */}
                {(reserva.comentarios || reserva.notas) && (
                    <div className="bg-slate-900/5 rounded-2xl p-4 border border-dashed border-slate-200 space-y-2">
                        <div className="flex items-center gap-2 text-slate-400">
                            <FileText size={14} />
                            <h4 className="text-[8px] font-black uppercase tracking-widest italic">Bitácora Interna</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 font-bold italic leading-relaxed">
                            {reserva.comentarios || reserva.notas}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
