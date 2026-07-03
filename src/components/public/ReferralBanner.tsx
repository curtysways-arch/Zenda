'use client';

import { useEffect, useState } from 'react';
import { Gift, X, Sparkles } from 'lucide-react';

interface ReferralBannerProps {
    referrerName: string;
    referralCode: string;
    negocioName: string;
    primaryColor?: string;
}

export default function ReferralBanner({
    referrerName,
    referralCode,
    negocioName,
    primaryColor = '#ec4899',
}: ReferralBannerProps) {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!referralCode) return;

        // Guardar en localStorage como respaldo (sobrevive cambios de tab / sessión)
        const key = `referral_code_backup`;
        const existing = localStorage.getItem(key);
        if (!existing) {
            localStorage.setItem(key, referralCode);
        }

        // ¿Ya descartó este banner antes?
        const dismissedKey = `referral_banner_dismissed_${referralCode}`;
        if (sessionStorage.getItem(dismissedKey)) return;

        // Mostrar con pequeña animación de entrada
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
    }, [referralCode]);

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem(`referral_banner_dismissed_${referralCode}`, '1');
        setTimeout(() => setVisible(false), 300);
    };

    if (!visible || dismissed) return null;

    return (
        <div
            className="fixed bottom-24 md:bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
            style={{
                transform: 'translateX(-50%)',
                animation: 'referralSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
        >
            <style>{`
                @keyframes referralSlideUp {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>

            <div
                className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20"
                style={{
                    background: `linear-gradient(135deg, ${primaryColor}ee 0%, ${primaryColor}cc 100%)`,
                    backdropFilter: 'blur(16px)',
                }}
            >
                {/* Brillo decorativo */}
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

                <div className="relative flex items-center gap-3 px-4 py-3.5">
                    {/* Ícono */}
                    <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                        <Gift size={22} className="text-white" />
                    </div>

                    {/* Texto */}
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Sparkles size={10} className="text-yellow-300" />
                            Invitación especial
                        </p>
                        <p className="text-white/95 text-[13px] font-semibold leading-tight mt-0.5 truncate">
                            <span className="font-black">{referrerName}</span> te invitó a{' '}
                            <span className="font-black">{negocioName}</span>
                        </p>
                        <p className="text-white/70 text-[10px] mt-0.5">
                            Reserva tu cita y disfruta el beneficio 🎁
                        </p>
                    </div>

                    {/* Cerrar */}
                    <button
                        onClick={handleDismiss}
                        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={14} className="text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}
