'use client';

import { use, useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Calendar, MapPin, Clock, ArrowRight, Smartphone, Sparkles, User, Scissors, Users, AlertCircle, ClipboardCheck } from 'lucide-react';
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
                    
                    // Auto-abrir modal si la cita ya finalizó y no ha calificado
                    const lowerEstado = data.estado?.toLowerCase();
                    const alreadyRated = data.ratings?.some((r: any) => r.raterRole === 'client');
                    if ((lowerEstado === 'completed' || lowerEstado === 'finalizada') && !alreadyRated) {
                        setIsRatingOpen(true);
                    }
                } else {
                    // FALLBACK: Intentar cargar desde localStorage si la API falla
                    let backup = localStorage.getItem(`last_appointment_${id}`);
                    if (!backup) {
                        backup = localStorage.getItem('last_appointment_latest');
                    }

                    if (backup) {
                        console.log("Cargando desde respaldo local...");
                        const backupData = JSON.parse(backup);
                        setAppointment(backupData);
                        setError(null);

                        const lowerEstado = backupData.estado?.toLowerCase();
                        const alreadyRated = backupData.ratings?.some((r: any) => r.raterRole === 'client');
                        if ((lowerEstado === 'completed' || lowerEstado === 'finalizada') && !alreadyRated) {
                            setIsRatingOpen(true);
                        }
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
            fetchDetails(); // Carga inicial
            
            // Polling solo si la cita está en estado no finalizado y no ha calificado
            const interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/appointments/${id}`);
                    const data = await res.json();
                    
                    if (res.ok && data && !data.error) {
                        setAppointment(data);
                        
                        const lowerEstado = data.estado?.toLowerCase();
                        const alreadyRated = data.ratings?.some((r: any) => r.raterRole === 'client');
                        
                        // Si se completó, abrimos modal y detenemos polling
                        if ((lowerEstado === 'completed' || lowerEstado === 'finalizada') && !alreadyRated) {
                            setIsRatingOpen(true);
                            clearInterval(interval);
                        } else if (lowerEstado === 'completed' || lowerEstado === 'finalizada' || lowerEstado === 'cancelled' || lowerEstado === 'no_show') {
                            // Si se completó calificada o se canceló, detenemos polling
                            clearInterval(interval);
                        }
                    }
                } catch (err) {
                    console.error("Error polling appointment:", err);
                }
            }, 6000); // Polling cada 6 segundos

            return () => clearInterval(interval);
        }
    }, [id]);

    // El layout ya inyecta --primary con el color correcto del negocio.
    // Usamos el colorPrimario real solo si ya cargó; de lo contrario la CSS var evita el flash.
    const primaryColor = appointment?.negocio?.colorPrimario || 'var(--primary)';

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 border-4 border-gray-100 border-t-primary animate-spin rounded-full mb-4" style={{ borderTopColor: primaryColor }}></div>
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest animate-pulse">Confirmando tu turno...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col items-center p-4 md:p-8">
            {/* No sobreescribimos --primary aquí: el layout ya lo inyectó correctamente */}
            
            <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
                {/* Header Exito */}
                <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: primaryColor }}></div>
                    <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-50 shadow-inner overflow-hidden" style={{ backgroundColor: `${primaryColor}15` }}>
                        {(appointment?.negocio?.logoUrl || appointment?.negocio?.logo) ? (
                            <img src={appointment.negocio.logoUrl || appointment.negocio.logo} alt={appointment.negocio.nombre} className="w-16 h-16 object-contain" />
                        ) : (
                            (appointment?.estado === 'confirmed' || appointment?.estado === 'CONFIRMADA')
                                ? <CheckCircle2 size={48} style={{ color: primaryColor }} strokeWidth={2.5} />
                                : <ClipboardCheck size={48} className="text-amber-400" strokeWidth={2.5} />
                        )}
                    </div>
                    
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-tight italic uppercase">
                        {appointment?.estado === 'confirmed' || appointment?.estado === 'CONFIRMADA' ? (
                            <>¡Reserva <br /> <span style={{ color: primaryColor }}>Confirmada!</span></>
                        ) : (
                            <>¡Solicitud <br /> <span style={{ color: primaryColor }}>Recibida!</span></>
                        )}
                    </h1>
                    <p className="text-gray-400 font-bold mt-4 text-sm leading-relaxed max-w-[280px] mx-auto uppercase tracking-wide">
                        {error ? 'Hubo un problema al cargar los detalles.' : 
                            (appointment?.estado === 'confirmed' || appointment?.estado === 'CONFIRMADA' 
                                ? 'Todo listo. Nos vemos pronto.' 
                                : 'Revisaremos tu solicitud y te notificaremos por WhatsApp.')}
                    </p>
                </div>

                {/* Banner de estado PENDIENTE */}
                {!error && appointment && appointment.estado !== 'confirmed' && appointment.estado !== 'CONFIRMADA' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-[2rem] px-6 py-5 flex items-start gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock size={20} className="text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1.5">
                                ⏳ Pendiente de Confirmación
                            </p>
                            <p className="text-xs font-bold text-amber-700 leading-relaxed">
                                El negocio revisará tu solicitud y recibirás una confirmación por WhatsApp en breve. Tu lugar está reservado temporalmente.
                            </p>
                        </div>
                    </div>
                )}

                {/* Banner de estado CONFIRMADO */}
                {!error && appointment && (appointment.estado === 'confirmed' || appointment.estado === 'CONFIRMADA') && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-[2rem] px-6 py-5 flex items-start gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 size={20} className="text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1.5">
                                ✅ Cita Confirmada
                            </p>
                            <p className="text-xs font-bold text-emerald-700 leading-relaxed">
                                Tu lugar está reservado con éxito. Te esperamos en la fecha y hora seleccionada.
                            </p>
                        </div>
                    </div>
                )}

                {/* Detalles del Turno */}
                <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-gray-100 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} style={{ color: primaryColor }} />
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumen de tu Visita</h3>
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
                            {/* Servicio Principal */}
                            <div className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-gray-100">
                                        <Scissors size={20} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Servicio</p>
                                        <p className="text-base font-black text-gray-900 leading-none">{appointment?.service?.nombre || 'Servicio de Spa'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Servicios Adicionales */}
                            {(() => {
                                let extras = [];
                                if (appointment?.extraServices && Array.isArray(appointment.extraServices)) {
                                    extras = appointment.extraServices;
                                } else if (appointment?.comentarios?.includes("Servicios extra:")) {
                                    const part = appointment.comentarios.split("Servicios extra:")[1];
                                    if (part) extras = part.split(", ").map((n: string) => ({ nombre: n.trim() }));
                                }

                                return extras.map((extra: any, index: number) => (
                                    <div key={index} className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-500" style={{ animationDelay: `${(index + 1) * 100}ms` }}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-gray-100">
                                                <Sparkles size={16} className="text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Servicio Adicional</p>
                                                <p className="text-base font-black text-gray-900 leading-none">{extra.nombre || extra}</p>
                                            </div>
                                        </div>
                                    </div>
                                ));
                            })()}

                            {/* Fecha y Hora */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Fecha</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} style={{ color: primaryColor }} />
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
                                        <Clock size={14} style={{ color: primaryColor }} />
                                        <p className="text-sm font-black text-gray-900 leading-none italic">{appointment?.horaInicio || '--:--'} HS</p>
                                    </div>
                                </div>
                            </div>

                            {/* Especialista */}
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
                                        {appointment?.staff?.name || appointment?.staff?.nombre || 'Cualquier profesional'}
                                    </p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1 italic">
                                        {appointment?.staff?.role || (appointment?.staffId ? 'Especialista' : 'Bienestar')}
                                    </p>
                                </div>
                            </div>

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
                        Ver todas mis citas
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

            {/* Modal de Calificación al Profesional */}
            {appointment && (
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
