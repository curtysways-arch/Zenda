"use client";

import { useState } from "react";
import {
    Ban,
    CheckCircle,
    Trash2,
    Loader2,
    Eye,
    ExternalLink,
    Pencil,
    QrCode,
    ShieldCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NegocioQRModal from "./NegocioQRModal";

interface NegocioActionsProps {
    negocio: any;
    onEdit: () => void;
}

export default function NegocioActions({ negocio, onEdit }: NegocioActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [enteringAdmin, setEnteringAdmin] = useState(false);
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);

    const handleEnterAdmin = async () => {
        setEnteringAdmin(true);
        try {
            const res = await fetch(`/api/superadmin/businesses/${negocio.id}/access`, {
                method: "POST",
            });
            if (res.ok) {
                const data = await res.json();
                router.push(data.redirectUrl || "/admin");
                router.refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "Error al acceder al admin del negocio");
                setEnteringAdmin(false);
            }
        } catch (err: any) {
            console.error(err);
            alert(err?.message || "Error al conectar con el servidor");
            setEnteringAdmin(false);
        }
    };

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
                const data = await res.json().catch(() => ({}));
                alert(data.error || "Error al eliminar el negocio");
            }
        } catch (error: any) {
            console.error(error);
            alert(error?.message || "Error de red al eliminar el negocio");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-end gap-1.5 px-2">
            {(loading || enteringAdmin) && <Loader2 size={16} className="animate-spin text-slate-400 mr-1" />}

            <button
                onClick={handleEnterAdmin}
                disabled={loading || enteringAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Entrar al panel Admin de este negocio con Sesión Delegada"
            >
                <ShieldCheck size={14} className="text-emerald-200" />
                <span>{enteringAdmin ? 'Entrando...' : 'Entrar al Admin'}</span>
            </button>

            <button
                onClick={() => setIsQRModalOpen(true)}
                disabled={loading}
                className="p-2 hover:bg-emerald-50 rounded-xl text-slate-400 hover:text-emerald-600 transition-all disabled:opacity-50"
                title="Generar Código QR"
            >
                <QrCode size={18} />
            </button>

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

            {/* Modal de Código QR */}
            <NegocioQRModal 
                isOpen={isQRModalOpen} 
                onClose={() => setIsQRModalOpen(false)} 
                negocio={negocio} 
            />
        </div>
    );
}
