"use client";

import { useEffect, useRef, useState } from "react";
import {
    Ban,
    CheckCircle,
    Trash2,
    Loader2,
    Eye,
    ExternalLink,
    Pencil,
    QrCode,
    ShieldCheck,
    MoreHorizontal
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
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [menuOpen]);

    const handleEnterAdmin = async () => {
        setEnteringAdmin(true);
        try {
            const res = await fetch(`/api/superadmin/businesses/${negocio.id}/access`, {
                method: "POST",
            });
            if (res.ok) {
                const data = await res.json();
                const targetUrl = data.redirectUrl || "/admin";
                window.open(targetUrl, "_blank");
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "Error al acceder al admin del negocio");
            }
        } catch (err: any) {
            console.error(err);
            alert(err?.message || "Error al conectar con el servidor");
        } finally {
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

    const isActive = negocio.estado === 'ACTIVO' || negocio.estado === 'PRUEBA';
    const item = "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 disabled:opacity-50";

    return (
        <div className="flex items-center justify-end gap-1">
            {(loading || enteringAdmin) && <Loader2 size={14} className="animate-spin text-slate-400" />}

            <button
                onClick={handleEnterAdmin}
                disabled={loading || enteringAdmin}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
                title="Entrar al panel de este negocio"
            >
                <ShieldCheck size={13} />
                {enteringAdmin ? 'Entrando…' : 'Entrar'}
            </button>

            <Link
                href={`/${negocio.slug}`}
                target="_blank"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                title="Ver página pública"
                aria-label="Ver página pública"
            >
                <ExternalLink size={16} />
            </Link>

            <div ref={menuRef} className="relative">
                <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                    aria-label="Más acciones"
                    aria-expanded={menuOpen}
                >
                    <MoreHorizontal size={16} />
                </button>
                {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30">
                        <Link href={`/superadmin/negocios/${negocio.id}`} className={item} onClick={() => setMenuOpen(false)}>
                            <Eye size={15} className="text-slate-400" /> Ver detalle
                        </Link>
                        <button type="button" className={item} onClick={() => { setMenuOpen(false); onEdit(); }} disabled={loading}>
                            <Pencil size={15} className="text-slate-400" /> Editar datos
                        </button>
                        <button type="button" className={item} onClick={() => { setMenuOpen(false); setIsQRModalOpen(true); }}>
                            <QrCode size={15} className="text-slate-400" /> Código QR
                        </button>
                        <div className="my-1 border-t border-slate-100" />
                        {isActive ? (
                            <button type="button" className={`${item} text-amber-700`} onClick={() => { setMenuOpen(false); updateStatus('SUSPENDIDO'); }} disabled={loading}>
                                <Ban size={15} /> Suspender
                            </button>
                        ) : (
                            <button type="button" className={`${item} text-emerald-700`} onClick={() => { setMenuOpen(false); updateStatus('ACTIVO'); }} disabled={loading}>
                                <CheckCircle size={15} /> Activar
                            </button>
                        )}
                        <button type="button" className={`${item} text-rose-600`} onClick={() => { setMenuOpen(false); deleteNegocio(); }} disabled={loading}>
                            <Trash2 size={15} /> Eliminar
                        </button>
                    </div>
                )}
            </div>

            <NegocioQRModal
                isOpen={isQRModalOpen}
                onClose={() => setIsQRModalOpen(false)}
                negocio={negocio}
            />
        </div>
    );
}
