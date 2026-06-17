"use client";

import { useState } from "react";
import {
    Ban,
    CheckCircle,
    Trash2,
    Loader2,
    Eye,
    ExternalLink,
    Pencil
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface NegocioActionsProps {
    negocio: any;
    onEdit: () => void;
}

export default function NegocioActions({ negocio, onEdit }: NegocioActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const updateStatus = async (nuevoEstado: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/negocios/${negocio.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: nuevoEstado }),
            });
            if (res.ok) {
                router.refresh();
            } else {
                alert("Error al actualizar el estado");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const deleteNegocio = async () => {
        if (!confirm(`¿Estás seguro de eliminar "${negocio.nombre}"? Esta acción borrará todas sus canchas, reservas y configuraciones.`)) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/negocios/${negocio.id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                router.refresh();
            } else {
                alert("Error al eliminar el negocio");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-end gap-1 px-2">
            {loading && <Loader2 size={16} className="animate-spin text-slate-400 mr-2" />}

            <Link
                href={`/${negocio.slug}`}
                target="_blank"
                className="p-2 hover:bg-indigo-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                title="Página Pública"
            >
                <ExternalLink size={18} />
            </Link>

            <button
                onClick={onEdit}
                disabled={loading}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-all disabled:opacity-50"
                title="Editar Datos"
            >
                <Pencil size={18} />
            </button>

            {negocio.estado === 'ACTIVO' || negocio.estado === 'PRUEBA' ? (
                <button
                    onClick={() => updateStatus('SUSPENDIDO')}
                    disabled={loading}
                    className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-all disabled:opacity-50"
                    title="Suspender"
                >
                    <Ban size={18} />
                </button>
            ) : (
                <button
                    onClick={() => updateStatus('ACTIVO')}
                    disabled={loading}
                    className="p-2 hover:bg-emerald-50 rounded-xl text-slate-400 hover:text-emerald-600 transition-all disabled:opacity-50"
                    title="Activar"
                >
                    <CheckCircle size={18} />
                </button>
            )}

            <button
                onClick={deleteNegocio}
                disabled={loading}
                className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-all disabled:opacity-50"
                title="Eliminar Permanente"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
}
