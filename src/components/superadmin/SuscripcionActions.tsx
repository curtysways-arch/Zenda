"use client";

import { useState } from "react";
import {
    RefreshCw,
    Clock,
    Loader2,
    Check,
    ChevronDown,
    XCircle,
    Trophy,
    TrophyIcon
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SuscripcionActionsProps {
    sub: any;
    planes: any[];
}

export default function SuscripcionActions({ sub, planes }: SuscripcionActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPlans, setShowPlans] = useState(false);

    const handleAction = async (action: string, data?: any) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/suscripciones`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    negocioId: sub.negocioId,
                    planId: data?.planId || sub.planId,
                    ...data
                }),
            });

            if (res.ok) {
                router.refresh();
                setShowPlans(false);
            } else {
                const errorData = await res.json();
                alert(errorData.error || "Error al procesar la acción");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFounder = () => {
        if (sub.isFounder) {
            const resp = prompt(
                `Este negocio ya es Fundador con un precio congelado de $${sub.lockedPrice}/mes.\n\n` +
                `* Para MODIFICAR el precio congelado, ingresa el nuevo valor (ej: 12.5):\n` +
                `* Para QUITAR el beneficio de fundador por completo, escribe la palabra "quitar":`,
                String(sub.lockedPrice)
            );
            
            if (resp === null) return; // Canceló
            
            const trimmed = resp.trim().toLowerCase();
            if (trimmed === "quitar") {
                handleAction("REMOVE_FOUNDER");
            } else {
                const newPrice = parseFloat(trimmed);
                if (isNaN(newPrice) || newPrice < 0) {
                    alert("Por favor ingresa un precio válido.");
                    return;
                }
                handleAction("SET_FOUNDER", { lockedPrice: newPrice });
            }
        } else {
            const resp = prompt(
                "¿Asignar este negocio como Fundador?\n\nIngresa el precio mensual congelado para este negocio:",
                "15"
            );
            if (resp === null) return; // Canceló
            const newPrice = parseFloat(resp.trim());
            if (isNaN(newPrice) || newPrice < 0) {
                alert("Por favor ingresa un precio válido.");
                return;
            }
            handleAction("SET_FOUNDER", { lockedPrice: newPrice });
        }
    };

    return (
        <div className="flex items-center justify-end gap-2 relative">
            <button
                onClick={() => handleAction('RENEW')}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 shadow-sm"
                title="Renovar 1 mes"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                +1 Mes
            </button>

            <button
                onClick={() => handleAction('EXTEND', { dias: 7 })}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                title="Extender 7 días (Cortesía)"
            >
                <Clock size={14} />
                +7d
            </button>

            {/* Botón de Fundador */}
            <button
                onClick={handleToggleFounder}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                    sub.isFounder
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-700'
                }`}
                title={sub.isFounder ? 'Quitar Fundador' : 'Asignar como Fundador'}
            >
                <Trophy size={14} className={sub.isFounder ? 'fill-amber-700' : ''} />
                {sub.isFounder ? 'Fundador' : 'Fundar'}
            </button>

            {sub.estado !== 'CANCELED' && sub.estado !== 'CANCELADA' && (
                <button
                    onClick={() => {
                        if (confirm('¿Está seguro de que desea cancelar esta suscripción? El negocio será suspendido de inmediato.')) {
                            handleAction('CANCEL');
                        }
                    }}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                    title="Cancelar Suscripción"
                >
                    <XCircle size={14} />
                    Cancelar
                </button>
            )}

            <div className="relative">
                <button
                    onClick={() => setShowPlans(!showPlans)}
                    disabled={loading}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                    title="Cambiar Plan"
                >
                    <ChevronDown size={18} />
                </button>

                {showPlans && (
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
                            Cambiar Plan
                        </div>
                        {planes.map((plan) => (
                            <button
                                key={plan.id}
                                onClick={() => handleAction('CHANGE_PLAN', { planId: plan.id })}
                                className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${
                                    sub.planId === plan.id ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-600'
                                }`}
                            >
                                <span>{plan.name || plan.nombre}</span>
                                <span className="text-[10px] text-slate-400">${plan.price}/mes</span>
                                {sub.planId === plan.id && <Check size={14} />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {showPlans && <div className="fixed inset-0 z-40" onClick={() => setShowPlans(false)} />}
        </div>
    );
}
