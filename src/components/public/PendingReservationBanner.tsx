'use client';

import { useState, useEffect } from 'react';
import { Clock, ChevronRight } from 'lucide-react';

interface PendingReservationBannerProps {
    reserva: {
        id: string;
        expiresAt: Date | string;
        cancha: { nombre: string };
    };
    slug: string;
    whatsapp?: string;
}

export default function PendingReservationBanner({ reserva, slug, whatsapp }: PendingReservationBannerProps) {
    const [timeLeft, setTimeLeft] = useState<{ m: number, s: number } | null>(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const calculateTime = () => {
            const expiresAt = new Date(reserva.expiresAt);
            const diff = expiresAt.getTime() - Date.now();
            
            if (diff <= 0) {
                setIsVisible(false);
                return;
            }

            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft({ m, s });
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);

        return () => clearInterval(interval);
    }, [reserva.expiresAt]);

    if (!isVisible || !timeLeft) return null;

    const isUrgent = timeLeft.m < 5;

    return (
        <div 
            onClick={() => window.location.href = `/${slug}/mis-reservas`}
            className="bg-[#07090f] border-b border-white/5 py-4 px-6 relative overflow-hidden animate-in slide-in-from-top duration-500 z-[120] cursor-pointer hover:bg-white/[0.02] transition-colors"
        >
            {/* Background Glow */}
            <div className={`absolute top-1/2 left-0 w-32 h-32 ${isUrgent ? 'bg-rose-500/20' : 'bg-amber-500/10'} rounded-full blur-[80px] -translate-y-1/2`} />
            
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10 text-center md:text-left">
                <div className="flex items-center gap-4">
                    <div className={`size-12 rounded-2xl flex items-center justify-center p-0.5 ${isUrgent ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                        <Clock size={24} className={isUrgent ? 'text-rose-500 animate-pulse' : 'text-amber-500'} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 justify-center md:justify-start">
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] italic ${isUrgent ? 'text-rose-500' : 'text-amber-500'}`}>
                                {isUrgent ? '⚠️ Acción Requerida' : 'Pago Pendiente'}
                            </span>
                        </div>
                        <h4 className="text-sm font-black text-white italic uppercase tracking-tight leading-none">
                            Tu turno en <span className="text-emerald-400">{reserva.cancha.nombre}</span> expira pronto
                        </h4>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center md:items-end">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">LIBERACIÓN EN:</p>
                        <div className={`text-2xl font-black italic tabular-nums leading-none ${isUrgent ? 'text-rose-500' : 'text-white'}`}>
                            {timeLeft.m.toString().padStart(2, '0')}:{timeLeft.s.toString().padStart(2, '0')}
                        </div>
                    </div>
                    
                    <a
                        href={whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! 👋 Quiero confirmar mi reserva de las ${reserva.cancha.nombre}. Mi ID de reserva es #${reserva.id.slice(-4).toUpperCase()}`)}` : `/${slug}/mis-reservas`}
                        target={whatsapp ? "_blank" : "_self"}
                        onClick={(e) => e.stopPropagation()}
                        className={`h-12 px-6 rounded-xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl ${
                            isUrgent 
                                ? 'bg-rose-500 text-white shadow-rose-500/20' 
                                : 'bg-white text-black shadow-white/5'
                        }`}
                    >
                        PAGAR AHORA
                        <ChevronRight size={16} />
                    </a>
                </div>
            </div>
        </div>
    );
}
