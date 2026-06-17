'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCountdown } from '@/hooks/useCountdown';
import { Clock, MapPin, User, Scissors, CheckCircle2, Loader2, Calendar, Sparkles } from 'lucide-react';

interface CheckInCardProps {
    appointment: {
        id: string;
        shareToken: string;
        fecha: string;          // ISO string
        horaInicio: string;     // "14:30"
        horaFin: string;
        estado: string;
        servicio: string;
        negocio: string;
        negocioSlug?: string;
        especialista?: string | null;
        especialistaAvatar?: string | null;
        clienteNombre: string;
        primaryColor?: string;
        logoUrl?: string;
        whatsapp?: string | null;
        checkedInAt?: string | null;
    };
}

type VisualMode = 'pending' | 'normal' | 'alert' | 'arrival' | 'waiting' | 'in_progress' | 'completed' | 'expired';

function getVisualMode(totalSecondsLeft: number, isNegative: boolean, estado: string): VisualMode {
    if (estado === 'pending') return 'pending';
    if (estado === 'completed') return 'completed';
    if (estado === 'in_progress') return 'in_progress';
    if (estado === 'client_checked_in') return 'waiting';

    const minLeft = isNegative ? -totalSecondsLeft / 60 : totalSecondsLeft / 60;

    if (isNegative && totalSecondsLeft > 12 * 3600) return 'expired'; // Permitir hasta 12 horas de retraso para pruebas
    if (!isNegative && totalSecondsLeft > 2 * 3600) return 'normal';
    if (!isNegative && totalSecondsLeft > 60 * 60) return 'alert';
    return 'arrival'; 
}

const MODE_STYLES: Record<VisualMode, { bg: string; border: string; badge: string; badgeText: string }> = {
    pending:     { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-500', badgeText: 'text-white' },
    normal:      { bg: 'bg-white', border: 'border-slate-100', badge: 'bg-slate-100', badgeText: 'text-slate-600' },
    alert:       { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100', badgeText: 'text-amber-700' },
    arrival:     { bg: 'bg-white', border: 'border-2 shadow-2xl scale-[1.02]', badge: 'bg-slate-900', badgeText: 'text-white' },
    waiting:     { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-500', badgeText: 'text-white' },
    in_progress: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-600', badgeText: 'text-white' },
    completed:   { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-800', badgeText: 'text-white' },
    expired:     { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100', badgeText: 'text-red-700' },
};

const MODE_LABELS: Record<VisualMode, string> = {
    pending:     'Tu cita está pendiente de confirmación',
    normal:      'Tu cita está confirmada',
    alert:       '¡Prepárate! Tu cita se acerca',
    arrival:     '¡Es hora! Llegó el momento',
    waiting:     'Estamos listos para atenderte',
    in_progress: 'Tu servicio está en progreso',
    completed:   '¡Gracias por tu visita!',
    expired:     'La ventana de check-in ha expirado',
};

export default function CheckInCard({ appointment }: CheckInCardProps) {
    const { id, shareToken, fecha, horaInicio, estado, primaryColor } = appointment;
    const color = primaryColor || '#6366f1';

    // Construir el Date objetivo de forma segura para zona horaria
    const [targetDate, setTargetDate] = useState<Date | null>(null);
    useEffect(() => {
        const [h, m] = horaInicio.split(':').map(Number);
        // Extraer YYYY, MM, DD de la cadena para evitar desfases de zona horaria
        const dateParts = fecha.split('T')[0].split('-').map(Number);
        const d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        d.setHours(h, m, 0, 0);
        setTargetDate(d);
    }, [fecha, horaInicio]);

    const { hours, minutes, seconds, totalSeconds, isNegative } = useCountdown(targetDate);
    const mode = getVisualMode(totalSeconds, isNegative, estado);
    const styles = MODE_STYLES[mode];

    // Check-in state
    const [checkInDone, setCheckInDone] = useState(estado === 'client_checked_in');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canCheckIn = (mode === 'arrival' || mode === 'alert') && !checkInDone && estado !== 'client_checked_in' && estado !== 'pending';

    const handleCheckIn = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/appointments/${appointment.id}/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shareToken: (appointment as any).shareToken }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al realizar check-in');
            setCheckInDone(true);
        } catch (err: any) {
            setError(err.message || 'Error interno');
        } finally {
            setLoading(false);
        }
    }, [appointment.id, (appointment as any).shareToken]);

    // Formato del timer
    const timerStr = `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;

    // Formatear etiqueta de fecha ignorando el offset UTC
    const dateParts = fecha.split('T')[0].split('-').map(Number);
    const localDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const fechaLabel = localDate.toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long'
    });

    const currentMode = checkInDone ? 'waiting' : mode;
    const currentStyles = MODE_STYLES[currentMode];

    return (
        <div
            className={`rounded-[2.5rem] border shadow-xl overflow-hidden transition-all duration-700 ${currentStyles.bg} ${currentStyles.border}`}
            style={currentMode === 'arrival' ? { borderColor: color } : {}}
        >
            {/* Header con color de marca */}
            <div
                className="px-7 pt-7 pb-5 flex items-start justify-between"
                style={{ background: currentMode === 'arrival' || currentMode === 'waiting' ? `linear-gradient(135deg, ${color}15, ${color}05)` : undefined }}
            >
                <div className="flex-1 min-w-0">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${currentStyles.badge} ${currentStyles.badgeText}`}>
                        {currentMode === 'waiting' ? <><CheckCircle2 size={11} /> Check-in realizado</> :
                         currentMode === 'in_progress' ? <><Sparkles size={11} /> En progreso</> :
                         currentMode === 'completed' ? <><CheckCircle2 size={11} /> Completado</> :
                         currentMode === 'pending' ? '⏳ Pendiente' :
                         currentMode === 'arrival' ? '⚡ Momento de llegar' :
                         currentMode === 'alert' ? '⏰ Próximamente' :
                         '📅 Confirmado'}
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                        {appointment.servicio}
                    </h2>
                    <p className="text-sm font-bold text-slate-500 mt-1 italic">{appointment.negocio}</p>
                </div>
                {appointment.logoUrl && (
                    <img src={appointment.logoUrl} alt={appointment.negocio} className="w-14 h-14 rounded-2xl object-cover border border-white shadow-md shrink-0 ml-4" />
                )}
            </div>

            {/* Info */}
            <div className="px-7 pb-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <Calendar size={15} style={{ color }} />
                    <span className="capitalize">{fechaLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <Clock size={15} style={{ color }} />
                    <span>{horaInicio} — {appointment.horaFin}</span>
                </div>
                {appointment.especialista && (
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <User size={15} style={{ color }} />
                        <span>{appointment.especialista}</span>
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="mx-7 border-t border-slate-100" />

            {/* Countdown o estado */}
            <div className="px-7 py-6 text-center">
                {(currentMode === 'waiting' || checkInDone) ? (
                    <div className="space-y-3">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: `${color}20` }}>
                            <CheckCircle2 size={32} style={{ color }} />
                        </div>
                        <p className="text-xl font-black text-slate-900 uppercase tracking-tight">
                            ¡Te estamos esperando!
                        </p>
                        <p className="text-sm font-bold text-slate-500">
                            El equipo ya está listo para atenderte. Por favor toma asiento.
                        </p>
                    </div>
                ) : currentMode === 'in_progress' ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
                            <p className="text-xl font-black text-purple-700 uppercase">Servicio en progreso</p>
                        </div>
                        <p className="text-sm font-bold text-slate-400">Relájate y disfruta tu experiencia ✨</p>
                    </div>
                ) : currentMode === 'completed' ? (
                    <div className="space-y-2">
                        <p className="text-2xl font-black text-slate-900 uppercase">¡Gracias por visitarnos!</p>
                        <p className="text-sm font-bold text-slate-500">Esperamos verte pronto. 💖</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                            {isNegative ? 'Lleva esperando' : 'Tu cita en'}
                        </p>
                        <div
                            className="text-5xl font-black tracking-tighter leading-none"
                            style={{ color: currentMode === 'arrival' ? color : '#0f172a' }}
                        >
                            {timerStr}
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                            {currentMode === 'arrival' ? MODE_LABELS.arrival : MODE_LABELS[currentMode]}
                        </p>
                    </div>
                )}
            </div>

            {/* Botón Check-In */}
            {canCheckIn && !checkInDone && (
                <div className="px-7 pb-7">
                    <button
                        onClick={handleCheckIn}
                        disabled={loading}
                        className="w-full py-5 rounded-[1.5rem] text-white font-black text-lg uppercase tracking-widest transition-all active:scale-95 shadow-xl disabled:opacity-60 flex items-center justify-center gap-3"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 12px 40px ${color}40` }}
                    >
                        {loading ? (
                            <><Loader2 size={22} className="animate-spin" /> Registrando...</>
                        ) : (
                            <>🚶 Ya llegué</>
                        )}
                    </button>
                    {error && (
                        <div className="mt-4 space-y-3">
                            <p className="text-center text-xs font-bold text-red-500 uppercase tracking-widest">{error}</p>
                            {error.toLowerCase().includes('expirado') && appointment.whatsapp && (
                                <button
                                    onClick={() => {
                                        const phone = appointment.whatsapp?.replace(/\+/g, '') || '';
                                        const msg = `Hola, mi check-in para la cita de las ${appointment.horaInicio} aparece como expirado pero ya estoy aquí.`;
                                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                    }}
                                    className="w-full py-3 bg-emerald-500/10 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                                    AVISAR POR WHATSAPP
                                </button>
                            )}
                        </div>
                    )}
                    <p className="text-center text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-widest">
                        Presiona cuando estés en el negocio
                    </p>
                </div>
            )}

            {/* Si ya hizo check-in o está pendiente, mostrar mensaje apropiado */}
            {!canCheckIn && (currentMode === 'normal' || currentMode === 'pending') && (
                <div className="px-7 pb-6">
                    <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {currentMode === 'pending' 
                            ? 'Completa el pago o espera la confirmación' 
                            : 'El botón de llegada aparecerá 30 min antes de tu cita'}
                    </p>
                </div>
            )}
        </div>
    );
}
