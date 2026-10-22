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
                window.location.href = expired ? '/superadmin/negocios?expired=true' : (data.redirectUrl || '/superadmin/negocios');
            } else {
                window.location.href = '/superadmin/negocios';
            }
        } catch (error) {
            window.location.href = '/superadmin/negocios';
        }
    };

    const isDemoMode = Boolean(isDemo || (expiresAt && (expiresAt - Date.now() > 2 * 60 * 60 * 1000)));

    return (
        <div className="bg-slate-900 text-white px-4 md:px-6 py-1.5 flex items-center justify-between gap-3 z-50 sticky top-0 text-xs">
            <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert size={14} className="text-amber-400 shrink-0" />
                <span className="text-slate-400 shrink-0 hidden sm:inline">Acceso delegado:</span>
                <strong className="font-semibold truncate">{businessName}</strong>
                {isDemoMode ? (
                    <span className="hidden sm:inline-flex items-center gap-1 text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                        <Sparkles size={11} /> Demo sin límite
                    </span>
                ) : timeLeft ? (
                    <span className="inline-flex items-center gap-1 text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full shrink-0">
                        <Clock size={11} className="text-amber-400" />
                        <span className="font-mono text-amber-300 font-semibold">{timeLeft}</span>
                    </span>
                ) : null}
            </div>

            <button
                onClick={() => handleExit(false)}
                disabled={isExiting}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-3 py-1 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
                <LogOut size={13} />
                {isExiting ? 'Saliendo…' : 'Salir del negocio'}
            </button>
        </div>
    );
}
