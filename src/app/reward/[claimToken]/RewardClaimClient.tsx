'use client';

/**
 * Pantalla del personal al escanear el QR de un premio.
 * Una decisión clara: "Entregar ahora" (el cliente está aquí) o "Avisar que está listo"
 * (hay que prepararlo y el cliente vuelve luego). Antes siempre eran dos pasos.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, BellRing, CheckCircle2, Clock, Gift, Loader2, Phone, User } from 'lucide-react';
import { UnifiedRewardData } from '@/lib/loyalty/rewardService';

interface RewardClaimClientProps {
    reward: UnifiedRewardData;
    sig: string;
    employeeName: string;
    audits: any[];
}

const ACCION: Record<string, string> = {
    SCANNED: 'Escaneado',
    REQUESTED: 'Cliente lo pidió',
    READY: 'Marcado como listo',
    DELIVERED: 'Entregado',
    REGENERATED: 'Código renovado',
};

const cuando = (d: any) =>
    new Date(d).toLocaleString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function RewardClaimClient({ reward, sig, employeeName, audits }: RewardClaimClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<'READY' | 'DELIVER' | null>(null);
    const [status, setStatus] = useState(reward.estado);
    const [error, setError] = useState<string | null>(null);
    const [revokedAt, setRevokedAt] = useState<Date | null>(reward.claimTokenRevokedAt ? new Date(reward.claimTokenRevokedAt) : null);
    const [showLog, setShowLog] = useState(false);

    const isExpired = reward.claimTokenExpiresAt ? new Date(reward.claimTokenExpiresAt) < new Date() : false;
    const delivered = !!revokedAt || status === 'ENTREGADO';
    const canAct = !delivered && !isExpired && (status === 'SOLICITADO' || status === 'LISTO_PARA_RETIRAR');

    const act = async (action: 'READY' | 'DELIVER') => {
        setLoading(action);
        setError(null);
        try {
            const res = await fetch('/api/admin/loyalty/entregar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ claimToken: reward.claimToken, action, sig }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo completar la acción.');
            setStatus(data.estado);
            if (data.estado === 'ENTREGADO') setRevokedAt(new Date());
            router.refresh();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
                    <p className="font-semibold">{reward.negocioNombre}</p>
                    <p className="text-sm text-slate-500">Atiende: {employeeName}</p>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 pt-5 space-y-4">
                {/* Estado principal */}
                {delivered ? (
                    <section className="rounded-3xl bg-emerald-600 text-white p-6 text-center">
                        <CheckCircle2 className="w-14 h-14 mx-auto" />
                        <h1 className="mt-3 text-2xl font-bold">Premio entregado</h1>
                        <p className="mt-1 text-white/85">
                            {revokedAt ? `El ${cuando(revokedAt)}. ` : ''}Este código ya no se puede volver a usar.
                        </p>
                    </section>
                ) : isExpired ? (
                    <section className="rounded-3xl bg-amber-50 ring-1 ring-amber-200 p-6 text-center">
                        <AlertTriangle className="w-12 h-12 mx-auto text-amber-600" />
                        <h1 className="mt-3 text-xl font-bold">El código venció</h1>
                        <p className="mt-1 text-slate-600">Pide al cliente que toque "Renovar código" en Mis premios y vuelve a escanear.</p>
                    </section>
                ) : status === 'LISTO_PARA_RETIRAR' ? (
                    <section className="rounded-3xl bg-white ring-2 ring-emerald-500 p-5">
                        <p className="text-sm font-semibold text-emerald-700">Listo para retirar</p>
                        <h1 className="mt-1 text-2xl font-bold">Entrega el premio al cliente</h1>
                    </section>
                ) : status === 'SOLICITADO' ? (
                    <section className="rounded-3xl bg-white ring-1 ring-slate-200 p-5">
                        <p className="text-sm font-semibold text-amber-700">Pendiente de entregar</p>
                        <h1 className="mt-1 text-2xl font-bold">¿El cliente está aquí?</h1>
                        <p className="mt-1 text-slate-600">Entrégalo ahora, o márcalo como listo si necesitas prepararlo y le avisamos por WhatsApp.</p>
                    </section>
                ) : (
                    <section className="rounded-3xl bg-white ring-1 ring-slate-200 p-5">
                        <h1 className="text-xl font-bold">Este premio no está pendiente de entrega</h1>
                        <p className="mt-1 text-slate-600">Estado actual: {status.toLowerCase().replace(/_/g, ' ')}.</p>
                    </section>
                )}

                {/* Ficha del premio */}
                <section className="rounded-3xl bg-white ring-1 ring-slate-200 overflow-hidden">
                    <div className="p-5 flex gap-4">
                        <span className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Gift className="w-7 h-7" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold leading-snug">{reward.nombre}</h2>
                            {reward.descripcion && <p className="text-slate-600 mt-0.5">{reward.descripcion}</p>}
                            {reward.claimCode && <p className="mt-2 font-mono font-bold tracking-[0.1em] text-slate-800">{reward.claimCode}</p>}
                        </div>
                    </div>
                    <dl className="border-t border-slate-100 divide-y divide-slate-100 text-sm">
                        <div className="px-5 py-3 flex items-center gap-3">
                            <User className="w-4 h-4 text-slate-400" />
                            <dt className="sr-only">Cliente</dt>
                            <dd className="font-medium">{reward.clienteNombre || 'Cliente'}</dd>
                        </div>
                        {reward.clienteTelefono && (
                            <div className="px-5 py-3 flex items-center gap-3">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <dt className="sr-only">Teléfono</dt>
                                <dd>{reward.clienteTelefono}</dd>
                            </div>
                        )}
                        {reward.claimTokenExpiresAt && !delivered && (
                            <div className="px-5 py-3 flex items-center gap-3 text-slate-500">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <dt className="sr-only">Vence</dt>
                                <dd>Código válido hasta el {cuando(reward.claimTokenExpiresAt)}</dd>
                            </div>
                        )}
                    </dl>
                </section>

                {error && <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}

                {canAct && (
                    <div className="space-y-2">
                        <button
                            onClick={() => act('DELIVER')}
                            disabled={!!loading}
                            className="w-full py-4 rounded-2xl bg-emerald-600 text-white text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {loading === 'DELIVER' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            Entregar ahora
                        </button>
                        {status === 'SOLICITADO' && (
                            <button
                                onClick={() => act('READY')}
                                disabled={!!loading}
                                className="w-full py-3.5 rounded-2xl bg-white ring-1 ring-slate-200 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {loading === 'READY' ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                                Lo preparo y aviso al cliente
                            </button>
                        )}
                    </div>
                )}

                {audits?.length > 0 && (
                    <section>
                        <button onClick={() => setShowLog((v) => !v)} className="text-sm font-medium text-slate-500 underline underline-offset-4">
                            {showLog ? 'Ocultar historial' : `Ver historial (${audits.length})`}
                        </button>
                        {showLog && (
                            <ol className="mt-2 rounded-2xl bg-white ring-1 ring-slate-200 divide-y divide-slate-100 text-sm">
                                {audits.map((a) => (
                                    <li key={a.id} className="px-4 py-2.5 flex justify-between gap-3">
                                        <span>
                                            {ACCION[a.accion] || a.accion}
                                            <span className="text-slate-500"> · {a.empleadoId || 'Sistema'}</span>
                                        </span>
                                        <span className="text-slate-400 shrink-0">{cuando(a.createdAt)}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}
