"use client";

import { useEffect, useState } from 'react';
import { ShieldAlert, LogOut, Clock, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DelegatedAdminBannerProps {
    businessName: string;
    expiresAt?: number | null;
    isDemo?: boolean;
}

export default function DelegatedAdminBanner({ businessName, expiresAt, isDemo }: DelegatedAdminBannerProps) {
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (!expiresAt || isDemo) return;

        const updateTimer = () => {
            const now = Date.now();
            const diff = expiresAt - now;

            if (diff <= 0) {
                setTimeLeft('Expirado');
                handleExit(true);
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [expiresAt, isDemo]);

    const handleExit = async (expired = false) => {
        if (isExiting) return;
        setIsExiting(true);
        try {
            const res = await fetch('/api/superadmin/delegated-session/exit', {
                method: 'POST',
            });
            if (res.ok) {
                const data = await res.json();
                router.push(expired ? '/superadmin?expired=true' : (data.redirectUrl || '/superadmin'));
                router.refresh();
            } else {
                router.push('/superadmin');
            }
        } catch (error) {
            router.push('/superadmin');
        }
    };

    const isDemoMode = Boolean(isDemo || (expiresAt && (expiresAt - Date.now() > 2 * 60 * 60 * 1000)));

    return (
        <div className="bg-slate-900 border-b border-amber-500/30 text-white px-4 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xl z-50 sticky top-0 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
                <div className="size-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 flex-shrink-0 animate-pulse">
                    <ShieldAlert size={16} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        Modo Acceso Delegado
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                        Administrando: <strong className="text-white uppercase font-black">{businessName}</strong>
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {isDemoMode ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-500/30">
                        <Sparkles size={14} className="text-emerald-400" />
                        <span className="text-[10px] uppercase font-black tracking-widest">Negocio Demo · Sin límite de tiempo</span>
                    </div>
                ) : timeLeft ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                        <Clock size={14} className="text-amber-400" />
                        <span className="font-mono text-amber-300 font-extrabold">{timeLeft}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-tight">restantes</span>
                    </div>
                ) : null}

                <button
                    onClick={() => handleExit(false)}
                    disabled={isExiting}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                    <LogOut size={14} />
                    {isExiting ? 'Saliendo...' : 'Salir del negocio'}
                </button>
            </div>
        </div>
    );
}
