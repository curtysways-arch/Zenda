'use client';

import { use, useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Calendar, MapPin, Clock, ArrowRight, Sparkles, User, Scissors, AlertCircle, ClipboardCheck, CreditCard, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import InstallAppButton from '@/components/InstallAppButton';
import RatingModal from '@/components/RatingModal';
import { useSearchParams } from 'next/navigation';

export default function ConfirmacionReservaPage({ 
    params 
}: { 
    params: Promise<{ slug: string, id: string }> 
}) {
    const { slug, id } = use(params);
    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRatingOpen, setIsRatingOpen] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

    const searchParams = useSearchParams();
    const queryCalificar = searchParams ? searchParams.get('calificar') : null;

    useEffect(() => {
        if (queryCalificar === 'true') {
            setIsRatingOpen(true);
        }
    }, [queryCalificar]);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/appointments/${id}`);
                const data = await res.json();
                
                if (res.ok && data && !data.error) {
                    setAppointment(data);
                    setError(null);
                    
                    const lowerEstado = data.estado?.toLowerCase();
                    const alreadyRated = data.ratings?.some((r: any) => r.raterRole === 'client');
                    if ((lowerEstado === 'completed' || lowerEstado === 'finalizada') && !alreadyRated) {
                        setIsRatingOpen(true);
                    }

                    if (data.negocio?.pagosActivos) {
                        try {
                            const payRes = await fetch('/api/pagos/reserva', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ reservaId: data.id })
                            });
                            const payData = await payRes.json();
                            if (payData.initPoint) {
                                setPaymentUrl(payData.initPoint);
                            }
                        } catch (e) {
                            console.error("Error obteniendo URL de pago:", e);
                        }
                    }
                } else {
                    let backup = localStorage.getItem(`last_appointment_${id}`);
                    if (!backup) {
                        backup = localStorage.getItem('last_appointment_latest');
                    }

                    if (backup) {
                        const backupData = JSON.parse(backup);
                        setAppointment(backupData);
                        setError(null);
                    } else {
                        setError(data.error || "No se encontró la reserva");
                    }
                }
            } catch (error) {
                console.error("Error fetching appointment:", error);
                setError("Error de conexión");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDetails();
            
            const interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/appointments/${id}`);
                    const data = await res.json();
                    
                    if (res.ok && data && !data.error) {
                        setAppointment(data);
                        
                        const lowerEstado = data.estado?.toLowerCase();
                        const alreadyRated = data.ratings?.some((r: any) => r.raterRole === 'client');
                        
                        if ((lowerEstado === 'completed' || lowerEstado === 'finalizada') && !alreadyRated) {
                            setIsRatingOpen(true);
                            clearInterval(interval);
                        } else if (lowerEstado === 'completed' || lowerEstado === 'finalizada' || lowerEstado === 'cancelled' || lowerEstado === 'no_show') {
                            clearInterval(interval);
                        }
                    }
                } catch (err) {
                    console.error("Error polling appointment:", err);
                }
            }, 6000);

            return () => clearInterval(interval);
        }
    }, [id]);

    const primaryColor = appointment?.negocio?.colorPrimario || 'var(--primary)';

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 border-4 border-gray-100 border-t-primary animate-spin rounded-full mb-4" style={{ borderTopColor: primaryColor }}></div>
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest animate-pulse">Confirmando tu reserva...</p>
            </div>
        );
    }

    const estadoNormalizado = appointment?.estado?.toLowerCase();

    const isConfirmed = estadoNormalizado === 'confirmed' || estadoNormalizado === 'confirmada' || estadoNormalizado === 'approved';
    const isClientCheckedIn = estadoNormalizado === 'client_checked_in';
    const isInProgress = estadoNormalizado === 'in_progress';
    const isCompleted = estadoNormalizado === 'completed' || estadoNormalizado === 'finalizada';
    const isCancelled = estadoNormalizado === 'cancelled' || estadoNormalizado === 'cancelada' || estadoNormalizado === 'no_show';
    const isPending = !isConfirmed && !isClientCheckedIn && !isInProgress && !isCompleted && !isCancelled;

    const isCancha = appointment?.negocio?.tipoNegocio === 'SPORTS_COURTS' || 
                    appointment?.negocio?.tipoNegocio === 'CANCHAS' || 
                    slug.includes('cancha') || 
                    (!appointment?.staffId && (!appointment?.staff || appointment?.staff?.nombre === 'Cualquier profesional' || appointment?.staff?.name === 'Cualquier profesional'));

    const porcentajeSena = appointment?.negocio?.pagoPorcentaje || 50;
    const precioTotalNum = Number(appointment?.precioTotal || appointment?.precio || 0);
    const montoSena = (precioTotalNum * porcentajeSena) / 100;
    const whatsapp = appointment?.negocio?.whatsapp || '';

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col items-center p-4 md:p-8 text-left">
            
            <div className="w-full max-w-lg space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                {/* Header Éxito */}
                <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-2xl shadow-gray-200/50 border border-gray-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: isCancha ? '#1dc95c' : primaryColor }}></div>
                    <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-5 ring-8 ring-gray-50 shadow-inner overflow-hidden" style={{ backgroundColor: isCancha ? '#1dc95c15' : `${primaryColor}15` }}>
                        {(appointment?.negocio?.logoUrl || appointment?.negocio?.logo) ? (
                            <img src={appointment.negocio.logoUrl || appointment.negocio.logo} alt={appointment.negocio.nombre} className="w-14 h-14 object-contain" />
                        ) : (
                            isConfirmed || isClientCheckedIn ? (
                                <CheckCircle2 size={40} className="text-emerald-500" strokeWidth={2.5} />
                            ) : isCancelled ? (
                                <AlertCircle size={40} className="text-red-500" strokeWidth={2.5} />
                            ) : (
                                <ClipboardCheck size={40} className="text-amber-500" strokeWidth={2.5} />
                            )
                        )}
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter leading-tight italic uppercase">
                        {isConfirmed ? (
                            <>¡Reserva <br /> <span className="text-emerald-500">Confirmada!</span></>
                        ) : isCancelled ? (
                            <>¡Reserva <br /> <span className="text-red-500">Cancelada!</span></>
                        ) : (
                            <>¡Solicitud <br /> <span className="text-amber-500">Recibida!</span></>
                        )}
                    </h1>
                    <p className="text-gray-400 font-bold mt-3 text-xs md:text-sm leading-relaxed max-w-[300px] mx-auto uppercase tracking-wide">
                        {error ? 'Hubo un problema al cargar los detalles.' : (
                            isConfirmed ? 'Todo listo. Tu lugar en la cancha está asegurado.' :
                            isCancelled ? 'Esta reserva no se encuentra activa.' :
                            'Paga tu seña para confirmar inmediatamente tu reserva.'
                        )}
                    </p>
                </div>

                {/* TARJETA DE SEÑA / PAGO PARA CONFIRMAR RESERVA DE CANCHA */}
                {isPending && (
                    <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-[#07090f] text-white rounded-[2.5rem] p-7 border border-emerald-500/30 shadow-2xl space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <Clock size={18} className="animate-pulse" />
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block leading-none">ACCIÓN REQUERIDA</span>
                                    <h3 className="text-sm font-black text-white italic uppercase mt-0.5">Seña para Confirmar Reserva</h3>
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-widest">
                                {porcentajeSena}% SEÑA
                            </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                            <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">MONTO DE SEÑA</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-emerald-400 italic tracking-tighter">${montoSena.toFixed(2)}</span>
                                    <span className="text-xs text-slate-400 font-bold">de ${precioTotalNum.toFixed(2)} Total</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            {paymentUrl && (
                                <a
                                    href={paymentUrl}
                                    className="w-full h-15 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-black rounded-2xl flex items-center justify-center gap-3 text-xs tracking-widest uppercase transition-all shadow-xl shadow-emerald-500/20"
                                >
                                    <CreditCard size={18} />
                                    PAGAR SEÑA AHORA (${montoSena.toFixed(2)})
                                </a>
                            )}

                            {whatsapp && (
                                <a
                                    href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! 👋 Acabo de hacer la reserva de las ${appointment?.service?.nombre || 'Cancha'} para el ${appointment?.fecha ? format(new Date(appointment.fecha), "d/MM", { locale: es }) : ''} a las ${appointment?.horaInicio || ''} HS. Mi ID de reserva es #${(appointment?.id || id).slice(-4).toUpperCase()}. Adjunto mi comprobante de seña ($${montoSena.toFixed(2)}).`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full h-14 bg-white/10 hover:bg-white/15 active:scale-95 text-emerald-400 border border-emerald-500/30 font-black rounded-2xl flex items-center justify-center gap-3 text-xs tracking-widest uppercase transition-all"
                                >
                                    <MessageSquare size={18} />
                                    ENVIAR COMPROBANTE DE SEÑA
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Banner de estado PENDIENTE / CONFIRMADO */}
                {!error && appointment && isPending && !paymentUrl && (
                    <div className="bg-amber-50 border border-amber-200 rounded-[2rem] px-6 py-5 flex items-start gap-4 shadow-sm animate-in fade-in duration-300">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock size={20} className="text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1.5">
                                ⏳ Pendiente de Confirmación
                            </p>
                            <p className="text-xs font-bold text-amber-700 leading-relaxed">
                                El negocio revisará tu solicitud de cancha y recibirás la confirmación en breve. Tu lugar está reservado temporalmente.
                            </p>
                        </div>
                    </div>
                )}

                {/* Detalles del Turno */}
                <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-gray-100 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className={isCancha ? 'text-emerald-500' : ''} style={{ color: isCancha ? '#1dc95c' : primaryColor }} />
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {isCancha ? 'Resumen de tu Reserva' : 'Resumen de tu Cita'}
                        </h3>
                    </div>

                    {error ? (
                        <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 text-center">
                            <AlertCircle className="mx-auto text-red-400 mb-2" size={32} />
                            <p className="text-red-600 font-bold text-sm mb-1">No pudimos cargar los detalles</p>
                            <p className="text-[10px] text-red-400 uppercase tracking-tighter mb-4">ID: {id}</p>
                            <button 
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-white border border-red-200 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Cancha / Servicio */}
                            <div className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-gray-100">
                                        <Scissors size={20} className={isCancha ? 'text-emerald-500' : 'text-gray-400'} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                                            {isCancha ? 'Cancha' : 'Servicio'}
                                        </p>
                                        <p className="text-base font-black text-gray-900 leading-none">{appointment?.service?.nombre || 'Cancha'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Fecha y Hora */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Fecha</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className={isCancha ? 'text-emerald-500' : ''} style={{ color: isCancha ? '#1dc95c' : primaryColor }} />
                                        <p className="text-sm font-black text-gray-900 leading-none">
                                            {appointment?.fecha ? (() => {
                                                try {
                                                    const date = new Date(appointment.fecha);
                                                    if (appointment.fecha.length === 10) {
                                                        const [y, m, d] = appointment.fecha.split('-').map(Number);
                                                        return format(new Date(y, m - 1, d), "d 'de' MMMM", { locale: es });
                                                    }
                                                    return format(date, "d 'de' MMMM", { locale: es });
                                                } catch (e) {
                                                    return 'Fecha no disponible';
                                                }
                                            })() : '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Horario</p>
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className={isCancha ? 'text-emerald-500' : ''} style={{ color: isCancha ? '#1dc95c' : primaryColor }} />
                                        <p className="text-sm font-black text-gray-900 leading-none italic">{appointment?.horaInicio || '--:--'} HS</p>
                                    </div>
                                </div>
                            </div>

                            {/* Especialista (SOLO SI NO ES CANCHA Y TIENE STAFF REAL) */}
                            {!isCancha && appointment?.staff && appointment?.staff?.nombre !== 'Cualquier profesional' && (
                                <div className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                        {(appointment?.staff?.imageMedia || appointment?.staff?.avatar) ? (
                                            <img 
                                                src={appointment.staff.imageMedia?.url ?? appointment.staff.avatar} 
                                                alt="Avatar" 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                                                <User size={20} className="text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Tu Especialista</p>
                                        <p className="text-sm font-black text-gray-900 leading-none">
                                            {appointment?.staff?.name || appointment?.staff?.nombre}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Ubicación */}
                            {(appointment?.service?.ubicacion || appointment?.negocio?.direccion) && (
                                <div className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-start gap-4">
                                    <MapPin size={16} className="text-gray-400 mt-1 shrink-0" />
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Ubicación</p>
                                        <p className="text-xs font-bold text-gray-600">
                                            {appointment?.service?.ubicacion?.direccion || appointment?.negocio?.direccion}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Acciones */}
                <div className="space-y-4">
                    <InstallAppButton variant="full" slug={slug} className="shadow-lg" />
                    
                    <Link
                        href={`/${slug}/mis-reservas`}
                        className="w-full py-6 bg-gray-900 text-white font-black rounded-[2rem] flex items-center justify-center gap-3 hover:bg-gray-800 transition shadow-2xl uppercase text-xs tracking-widest"
                    >
                        {isCancha ? 'Ver todas mis reservas' : 'Ver todas mis citas'}
                        <ArrowRight size={16} />
                    </Link>

                    <Link
                        href={`/${slug}`}
                        className="w-full py-5 bg-white text-gray-400 font-bold rounded-[2rem] flex items-center justify-center gap-2 hover:bg-gray-50 transition border border-gray-100 uppercase text-[10px] tracking-[0.2em]"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>

            {/* Modal de Calificación */}
            {appointment && !isCancha && (
                <RatingModal 
                    isOpen={isRatingOpen}
                    onClose={() => setIsRatingOpen(false)}
                    appointmentId={id}
                    raterRole="client"
                    targetName={appointment.staff?.name || appointment.staff?.nombre || 'nuestro profesional'}
                />
            )}
        </div>
    );
}
