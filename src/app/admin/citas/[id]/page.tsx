'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
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
    CreditCard,
    Plus,
    History,
    FileText,
    Bell,
    Check,
    Sparkles,
    Zap
} from 'lucide-react';
import { clsx } from 'clsx';

import MobileAppointmentDetail from '@/components/admin/mobile/MobileAppointmentDetail';
import { useConfirm } from '@/components/admin/ConfirmContext';
import RatingModal from '@/components/RatingModal';
import { toLocalDateFromUTC } from '@/lib/utils';

export default function ReservaDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { confirm } = useConfirm();
    const { id } = use(params);
    const router = useRouter();

    useEffect(() => {
        if (id === 'nueva') {
            router.replace('/admin/citas/nueva');
            return;
        }
    }, [id, router]);
    const [reserva, setReserva] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    
    const [pagoData, setPagoData] = useState({
        monto: '',
        metodo: 'EFECTIVO',
        referencia: '',
        notas: ''
    });

    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
    const [hasProfessionalRated, setHasProfessionalRated] = useState(false);

    const fetchReserva = async () => {
        if (id === 'nueva') return;
        try {
            const res = await fetch(`/api/appointments/${id}`);
            if (!res.ok) {
                setLoading(false);
                return;
            }
            const data = await res.json();
            setReserva(data);
            
            // Verificar si el profesional ya calificó
            const profRated = data.ratings?.some((r: any) => r.raterRole === 'professional');
            setHasProfessionalRated(!!profRated);

            // Trigger automático si acaba de ser completada y no ha calificado
            if (data.estado === 'completed' && !profRated) {
                setIsRatingModalOpen(true);
            }
        } catch (error) {
            console.error('Error fetching detail:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReserva(); }, [id]);

    const handleStatusUpdate = async (newStatus: string) => {
        const statusMap: Record<string, string> = {
            'confirmed': 'CONFIRMAR',
            'client_checked_in': 'CONFIRMAR LLEGADA',
            'in_progress': 'MARCAR LLEGADA',
            'completed': 'FINALIZAR CITA',
            'cancelled': 'CANCELAR',
            'pending': 'RESTAURAR'
        };

        const actionText = statusMap[newStatus] || newStatus;
        let showMontoInput = false;
        let precioSugerido = 0;

        if (newStatus === 'completed') {
            showMontoInput = true;
            precioSugerido = reserva?.total || reserva?.service?.precio || 0;
        }

        const res = await confirm(`¿Estás seguro que deseas ${actionText} esta reserva?`, {
            title: newStatus === 'completed' ? 'Finalizar y Cobrar' : 'Actualizar Estado',
            showInput: showMontoInput,
            inputValue: precioSugerido,
            inputLabel: 'Monto Cobrado ($)',
            confirmText: newStatus === 'completed' ? 'Finalizar y Cobrar' : 'Aceptar',
            type: newStatus === 'cancelled' ? 'danger' : 'warning'
        });

        if (!res) return;

        const montoCobrado = typeof res === 'object' ? res.value : undefined;
        
        setIsUpdatingStatus(true);
        try {
            const resFetch = await fetch(`/api/appointments/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    estado: newStatus,
                    montoCobrado: montoCobrado
                })
            });
            if (resFetch.ok) {
                await fetchReserva();
            } else {
                const err = await resFetch.json();
                const hasAlerted = await confirm(`Error: ${err.error || 'No se pudo actualizar el estado'}`, {
                    title: 'Error',
                    confirmText: 'Entendido',
                    type: 'danger'
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleAddPayment = async () => {
        if (!pagoData.monto) return;
        try {
            const res = await fetch(`/api/appointments/${id}/pagos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    monto: parseFloat(pagoData.monto),
                    metodo: pagoData.metodo,
                    referencia: pagoData.referencia,
                    notas: pagoData.notas
                })
            });
            if (res.ok) {
                setIsPaymentModalOpen(false);
                setPagoData({ monto: '', metodo: 'EFECTIVO', referencia: '', notas: '' });
                fetchReserva();
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-6 text-slate-400 font-bold uppercase tracking-widest text-[10px] italic animate-pulse">Consultando expediente...</p>
        </div>
    );

    if (!reserva) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-10 text-center gap-8">
            <div className="size-24 rounded-[2.5rem] bg-white border border-slate-200 flex items-center justify-center text-slate-200 shadow-xl">
                <Clock3 size={48} strokeWidth={1} />
            </div>
            <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Reserva No Encontrada</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">El registro #{id.slice(-6)} no existe o ha sido eliminado.</p>
            </div>
            <button 
                onClick={() => router.push('/admin')}
                className="px-10 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-slate-200 active:scale-95"
            >
                VOLVER AL DASHBOARD
            </button>
        </div>
    );

    const totalPagado = reserva?.pagos?.reduce((acc: number, p: any) => acc + (p.monto || 0), 0) || 0;
    const deudaPendiente = Math.max(0, (reserva?.total || 0) - totalPagado);

    const sendWhatsApp = (type: 'reminder' | 'debt') => {
        if (!reserva) return;
        const phone = reserva.cliente.telefono.replace(/\D/g, '');
        let message = '';
        const serviceName = reserva.service?.nombre || reserva.nombreServicio || 'Servicio';
        if (type === 'reminder') {
            message = `¡Hola ${reserva.cliente.nombre}! Te recordamos tu cita de ${serviceName} para el día ${format(toLocalDateFromUTC(reserva.fecha), 'd MMMM', { locale: es })} a las ${reserva.horaInicio}. ¡Te esperamos!`;
        } else {
            message = `Hola ${reserva.cliente.nombre}, te escribimos para tu reserva de ${serviceName}. Vemos que tienes un saldo pendiente de $${deudaPendiente}. ¿Cómo deseas cancelarlo?`;
        }
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const primaryColor = '#0ea5e9'; // Podrías obtenerlo dinámicamente

    return (
        <div className="min-h-screen bg-slate-50 md:pb-20 md:pt-10 md:px-4">
            {/* VISTA MÓVIL */}
            <div className="md:hidden">
                <MobileAppointmentDetail 
                    reserva={reserva}
                    primaryColor={primaryColor}
                    onStatusUpdate={handleStatusUpdate}
                    onAddPayment={() => setIsPaymentModalOpen(true)}
                    sendWhatsApp={sendWhatsApp}
                />
            </div>

            {/* VISTA ESCRITORIO */}
            <div className="hidden md:block max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Header Premium */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group">
                        <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">Volver al Inbox</span>
                    </button>
                    <div className="flex bg-white p-2 rounded-2xl border border-slate-200 shadow-sm gap-1">
                        <button onClick={() => sendWhatsApp('reminder')} className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Enviar Recordatorio">
                            <Bell size={20} />
                        </button>
                        <button onClick={() => sendWhatsApp('debt')} className="p-3 text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Recordatorio Deuda">
                            <MessageSquare size={20} />
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[3.5rem] p-8 md:p-14 border border-slate-200 shadow-xl space-y-12">
                    {/* Sección Cliente & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-slate-100 pb-12">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-400 text-3xl font-black border border-slate-200">
                                {reserva.cliente.nombre.charAt(0)}
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">{reserva.cliente.nombre}</h1>
                                <div className="flex items-center gap-3 mt-4">
                                    <Phone size={14} className="text-emerald-600" />
                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">{reserva.cliente.telefono}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end justify-center">
                            <div className={clsx(
                                "px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] border shadow-sm",
                                (reserva.estado === 'confirmed' || reserva.estado === 'approved') ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                reserva.estado === 'cancelled' ? "bg-rose-50 text-rose-700 border-rose-100" :
                                reserva.estado === 'client_checked_in' ? "bg-indigo-50 text-indigo-700 border-indigo-100 animate-pulse" :
                                reserva.estado === 'in_progress' ? "bg-purple-50 text-purple-700 border-purple-100" :
                                reserva.estado === 'completed' ? "bg-slate-900 text-white border-slate-900" :
                                reserva.estado === 'expired' ? "bg-slate-100 text-slate-500 border-slate-200" :
                                "bg-amber-50 text-amber-700 border-amber-100"
                            )}>
                                {reserva.estado === 'pending' ? 'Pendiente' :
                                 reserva.estado === 'confirmed' || reserva.estado === 'approved' ? 'Confirmada' : 
                                 reserva.estado === 'client_checked_in' ? 'Llegó (Por Confirmar)' :
                                 reserva.estado === 'in_progress' ? 'Llegó' :
                                 reserva.estado === 'completed' ? 'Finalizada' :
                                 reserva.estado === 'cancelled' ? 'Cancelada' :
                                 reserva.estado === 'expired' ? 'Expirada' : 'Pendiente'}
                            </div>
                            <p className="mt-3 text-[9px] font-black text-slate-300 uppercase tracking-widest">ID: #{reserva.id.slice(-8)}</p>
                        </div>
                    </div>

                    {/* Dashboard Financiero */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 space-y-4 shadow-inner relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-200/50 rounded-full blur-3xl -mr-12 -mt-12" />
                            <div className="flex items-center justify-between relative z-10">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Turno Total</span>
                                <CreditCard size={18} className="text-slate-300" />
                            </div>
                            <h2 className="text-6xl font-black text-slate-900 tracking-tighter italic uppercase leading-none relative z-10">${reserva.total}</h2>
                            <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100 relative z-10">
                                <Zap size={10} /> Precio Final
                            </div>
                        </div>
                        
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-3xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-1000" />
                            <div className="flex items-center justify-between relative z-10">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Total Cobrado</span>
                                <Plus size={18} className="text-emerald-500" />
                            </div>
                            <h2 className="text-6xl font-black text-emerald-600 tracking-tighter italic uppercase leading-none relative z-10">${totalPagado}</h2>
                            <button 
                                onClick={() => setIsPaymentModalOpen(true)} 
                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 relative z-10"
                            >
                                REGISTRAR INGRESO
                            </button>
                        </div>

                        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-5 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Saldo Pendiente</span>
                                <DollarSign size={18} className="text-amber-500" />
                            </div>
                            <h2 className={clsx(
                                "text-6xl font-black tracking-tighter italic uppercase leading-none",
                                deudaPendiente > 0 ? "text-amber-600 animate-pulse" : "text-slate-200"
                            )}>${deudaPendiente}</h2>
                            <div className={clsx(
                                "w-full py-3 rounded-2xl text-center text-[9px] font-black uppercase tracking-[0.2em] border transition-all",
                                deudaPendiente === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-white text-slate-400 border-slate-100"
                            )}>
                                {deudaPendiente === 0 ? 'LIQUIDADA' : 'DEUDA ACTIVA'}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Dashboard de Servicios Detallado (LISTADO IZQUIERDA) */}
                        <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl space-y-8">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                                <div className="flex items-center gap-3">
                                    <div className="size-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 italic">Desglose de Servicios</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                                        {format(toLocalDateFromUTC(reserva.fecha), "EEEE d 'de' MMMM", { locale: es })}
                                    </p>
                                    <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2 text-right">INICIO: {reserva.horaInicio} HS</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {/* Servicio Principal */}
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-6 group hover:border-emerald-200 transition-all">
                                    <div className="size-20 rounded-2xl overflow-hidden bg-white shrink-0 border border-slate-200 shadow-inner">
                                        {(reserva.service?.imagenes?.[0]?.url || reserva.service?.Imagen?.[0]?.url) ? (
                                            <img 
                                                src={reserva.service?.imagenes?.[0]?.url || reserva.service?.Imagen?.[0]?.url} 
                                                alt={reserva.service.nombre}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Sparkles size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Servicio Base</p>
                                        <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
                                            {reserva.service?.nombre || reserva.nombreServicio}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <div className="size-1.5 bg-emerald-500 rounded-full" />
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">
                                                Profesional: {reserva.staff?.name || 'Por asignar'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-black text-slate-900 italic tracking-tighter leading-none">
                                            ${reserva.precioOriginal || (reserva.total - (Array.isArray(reserva.extraServices) ? reserva.extraServices.reduce((acc: number, s: any) => acc + (s.precio || 0), 0) : 0))}
                                        </p>
                                    </div>
                                </div>

                                {/* Servicios Adicionales */}
                                {reserva.extraServices && Array.isArray(reserva.extraServices) && reserva.extraServices.map((extra: any, i: number) => (
                                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center gap-6 group hover:border-emerald-200 transition-all">
                                        <div className="size-20 rounded-2xl bg-emerald-50/50 flex items-center justify-center text-emerald-500 border border-emerald-100/50 shrink-0 shadow-sm">
                                            <Plus size={32} strokeWidth={3} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 italic">Adicional</p>
                                            <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                                                {extra.nombre}
                                            </h4>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-black text-slate-900 italic tracking-tighter leading-none">${extra.precio || 0}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Total Sub-resumen */}
                            <div className="pt-8 border-t-2 border-dashed border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black text-slate-900 uppercase italic tracking-tighter">Total Acumulado</p>
                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">Incluye todos los servicios e insumos</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-6xl font-black text-slate-900 italic tracking-tighter leading-none">${reserva.total}</p>
                                </div>
                            </div>
                        </div>

                        {/* Protocolo Operativo (COLUMNA DERECHA) */}
                        <div className="p-10 bg-white border border-slate-100 rounded-[3rem] space-y-8 shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Acciones Rápidas</h3>
                                <Zap size={16} className="text-emerald-500 animate-pulse" />
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4">
                                {reserva.estado === 'pending' && (
                                    <button onClick={() => handleStatusUpdate('confirmed')} className="flex items-center justify-between p-6 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-3xl font-black uppercase italic tracking-widest text-xs hover:bg-emerald-100 transition-all group shadow-sm">
                                        Confirmar Reserva
                                        <CheckCircle2 className="group-hover:scale-125 transition-transform" />
                                    </button>
                                )}

                                {(reserva.estado === 'confirmed' || reserva.estado === 'approved' || reserva.estado === 'pending') && (
                                    <button onClick={() => handleStatusUpdate('in_progress')} className="flex items-center justify-between p-6 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-3xl font-black uppercase italic tracking-widest text-xs hover:bg-indigo-100 transition-all group shadow-sm">
                                        Marcar Llegada
                                        <Zap className="group-hover:scale-125 transition-transform" />
                                    </button>
                                )}

                                {reserva.estado === 'client_checked_in' && (
                                    <button onClick={() => handleStatusUpdate('in_progress')} className="flex items-center justify-between p-6 bg-purple-50 border border-purple-100 text-purple-700 rounded-3xl font-black uppercase italic tracking-widest text-xs hover:bg-purple-100 transition-all group shadow-sm">
                                        Confirmar Llegada
                                        <Sparkles className="group-hover:scale-125 transition-transform" />
                                    </button>
                                )}

                                {reserva.estado === 'in_progress' && (
                                    <button onClick={() => handleStatusUpdate('completed')} className="flex items-center justify-between p-6 bg-slate-900 border border-slate-900 text-white rounded-3xl font-black uppercase italic tracking-widest text-xs hover:bg-black transition-all group shadow-xl shadow-slate-200">
                                        Finalizar Cita
                                        <CheckCircle2 className="group-hover:scale-125 transition-transform" />
                                    </button>
                                )}

                                {reserva.estado !== 'completed' && reserva.estado !== 'cancelled' && (
                                    <button onClick={() => handleStatusUpdate('cancelled')} className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 text-slate-400 rounded-3xl font-black uppercase italic tracking-widest text-[10px] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all group">
                                        Cancelar Cita
                                        <XCircle className="group-hover:rotate-90 transition-transform text-slate-300 group-hover:text-rose-500" />
                                    </button>
                                )}

                                {reserva.estado === 'expired' && (
                                    <button onClick={() => handleStatusUpdate('pending')} className="flex items-center justify-between p-6 bg-amber-50 border border-amber-100 text-amber-700 rounded-3xl font-black uppercase italic tracking-widest text-xs hover:bg-amber-100 transition-all group shadow-sm">
                                        Reactivar Cita (Poner Pendiente)
                                        <History className="group-hover:rotate-180 transition-transform" />
                                    </button>
                                )}

                                {reserva.estado === 'cancelled' && (
                                    <button onClick={() => handleStatusUpdate('pending')} className="flex items-center justify-between p-6 bg-amber-50 border border-amber-100 text-amber-700 rounded-3xl font-black uppercase italic tracking-widest text-xs hover:bg-amber-100 transition-all group shadow-sm">
                                        Restaurar Cita
                                        <History className="group-hover:rotate-180 transition-transform" />
                                    </button>
                                )}

                                {reserva.estado === 'completed' && (
                                    <div className="p-10 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                                        <div className="size-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <CheckCircle2 size={32} className="text-emerald-500" />
                                        </div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Servicio Completado Exitosamente</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Historial de Pagos */}
                    <div className="space-y-6 pt-10 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <History size={20} className="text-slate-400" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 italic">Historial de Ingresos</h3>
                            </div>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                {reserva.pagos?.length || 0} Tránsitos
                            </span>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Fecha / Hora</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Método</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 text-right">Recibido</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {reserva.pagos?.map((pago: any) => (
                                        <tr key={pago.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-black text-slate-800 italic uppercase">{format(new Date(pago.fecha), 'd MMM, HH:mm', { locale: es })}</p>
                                                <p className="text-[9px] font-black text-slate-300 italic uppercase">REF: {pago.referencia || 'SIN REF'}</p>
                                            </td>
                                            <td className="px-8 py-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest">{pago.metodo}</td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="text-2xl font-black text-slate-900 tracking-tighter italic leading-none">${pago.monto}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(reserva.pagos?.length === 0) && (
                                        <tr>
                                            <td colSpan={3} className="px-8 py-10 text-center text-slate-300 font-bold uppercase tracking-widest text-[9px]">No hay pagos registrados aún</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {reserva.notas && (
                        <div className="p-10 bg-white border border-slate-200 rounded-[3rem] space-y-4">
                            <div className="flex items-center gap-3 text-slate-400">
                                <FileText size={18} />
                                <span className="text-[11px] font-black uppercase tracking-widest italic">Bitácora Interna</span>
                            </div>
                            <p className="text-slate-500 font-bold uppercase italic text-[11px] leading-relaxed select-all">
                                {reserva.notas}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Pago */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsPaymentModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden p-10 md:p-14 space-y-10 animate-in zoom-in-95 duration-300">
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Registrar Ingreso</h2>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Abono parcial o liquidación total</p>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic">Monto a Percibir</label>
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-[2rem] overflow-hidden focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all group">
                                    <div className="pl-10 pr-4 text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                                        <DollarSign size={40} strokeWidth={3} />
                                    </div>
                                    <input 
                                        type="number" 
                                        value={pagoData.monto}
                                        onChange={(e) => setPagoData({...pagoData, monto: e.target.value})}
                                        className="w-full bg-transparent text-slate-900 text-5xl font-black py-8 pr-10 focus:outline-none italic tracking-tighter placeholder:text-slate-200" 
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {['EFECTIVO', 'TRANSFERENCIA'].map((m) => (
                                    <button 
                                        key={m} 
                                        onClick={() => setPagoData({...pagoData, metodo: m})}
                                        className={clsx(
                                            "py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                            pagoData.metodo === m ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-200"
                                        )}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic">Referencia / Comprobante</label>
                                <input 
                                    type="text" 
                                    value={pagoData.referencia}
                                    onChange={(e) => setPagoData({...pagoData, referencia: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-black rounded-2xl py-5 px-8 focus:outline-none focus:border-emerald-500 transition-all uppercase tracking-widest italic" 
                                    placeholder="NRO DE OPERACIÓN"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleAddPayment}
                                className="flex-[2] py-6 bg-emerald-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
                            >
                                Guardar Pago
                                <Check size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <RatingModal 
                isOpen={isRatingModalOpen}
                onClose={() => setIsRatingModalOpen(false)}
                appointmentId={id}
                raterRole="professional"
                targetName={reserva?.cliente?.nombre || 'el cliente'}
                onSuccess={() => {
                    setHasProfessionalRated(true);
                    fetchReserva();
                }}
            />

            {/* SUPER LOADING OVERLAY */}
            {isUpdatingStatus && (
                <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative flex flex-col items-center">
                        {/* Círculo animado exterior */}
                        <div className="size-24 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                        {/* Círculo animado interior en dirección contraria */}
                        <div className="absolute inset-0 size-24 rounded-full border-4 border-dashed border-emerald-400/10 animate-spin [animation-direction:reverse] [animation-duration:3s]" />
                        
                        <div className="mt-8 space-y-2 text-center">
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter animate-pulse">
                                Actualizando Agenda
                            </h3>
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] leading-none animate-pulse">
                                Por favor espera un momento...
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
