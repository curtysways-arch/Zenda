"use client";

import { useEffect, useState } from "react";
import { Trophy, ShieldAlert, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface PlanRestrictionProps {
    children: React.ReactNode;
    feature: 'tournaments' | 'locations' | 'reservations' | 'fields';
}

export default function PlanRestriction({ children, feature }: PlanRestrictionProps) {
    const [status, setStatus] = useState<{ allowed: boolean; message?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                // Endpoint que crearemos para validar acceso desde el cliente
                const res = await fetch(`/api/admin/validate-access?feature=${feature}`);
                if (res.ok) {
                    const data = await res.json();
                    setStatus(data);
                } else {
                    setStatus({ allowed: false, message: "Error al validar el acceso." });
                }
            } catch (error) {
                setStatus({ allowed: false, message: "Error de conexión." });
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
    }, [feature]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <p className="text-slate-500 font-medium">Validando permisos del plan...</p>
            </div>
        );
    }

    if (status && !status.allowed) {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                    <Trophy size={40} className="text-amber-500" />
                    <div className="absolute -bottom-2 -right-2 bg-red-500 text-white p-1.5 rounded-full border-4 border-white">
                        <Lock size={16} />
                    </div>
                </div>

                <h2 className="text-2xl font-black text-slate-900 mb-3">Módulo No Disponible</h2>
                <p className="text-slate-500 mb-8 font-medium italic">
                    {status.message || "Tu plan actual no incluye el acceso a esta funcionalidad."}
                </p>

                <div className="space-y-3">
                    <Link
                        href="/admin/plan"
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                    >
                        <Zap size={18} />
                        Mejorar mi Plan
                    </Link>
                    <Link
                        href="/admin"
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all"
                    >
                        <ArrowLeft size={18} />
                        Volver al Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

function Zap({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    );
}
