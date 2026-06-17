"use client";

import { useState } from "react";
import {
    Edit2,
    Trash2,
    Check,
    X,
    Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import PlanModal from "./PlanModal";

interface PlanCardActionsProps {
    plan: any;
}

export default function PlanCardActions({ plan }: PlanCardActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const toggleStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/planes/${plan.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activo: !plan.activo }),
            });
            if (res.ok) router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const deletePlan = async () => {
        if (!confirm("¿Estás seguro de eliminar este plan?")) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/planes/${plan.id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="p-4 bg-slate-50 flex items-center justify-end gap-2 border-t border-slate-100">
                {loading && <Loader2 size={18} className="animate-spin text-slate-400 mr-2" />}

                <button
                    onClick={() => setIsEditModalOpen(true)}
                    disabled={loading}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all disabled:opacity-50"
                    title="Editar"
                >
                    <Edit2 size={18} />
                </button>

                <button
                    onClick={toggleStatus}
                    disabled={loading}
                    className={`p-2 rounded-lg transition-all disabled:opacity-50 ${plan.activo
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-white'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-white'
                        }`}
                    title={plan.activo ? "Desactivar" : "Activar"}
                >
                    {plan.activo ? <X size={18} /> : <Check size={18} />}
                </button>

                <button
                    onClick={deletePlan}
                    disabled={loading}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all disabled:opacity-50"
                    title="Eliminar"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            <PlanModal
                plan={plan}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
            />
        </>
    );
}
