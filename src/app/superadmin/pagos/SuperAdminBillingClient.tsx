'use client';

import { useState } from "react";
import { Check, X, ExternalLink, Loader2, Landmark, Banknote, Calendar, CreditCard, Eye } from "lucide-react";
import Image from "next/image";

interface SuperAdminBillingClientProps {
    initialPayments: any[];
    plansMap: Record<string, string>;
}

export default function SuperAdminBillingClient({ initialPayments, plansMap }: SuperAdminBillingClientProps) {
    const [payments, setPayments] = useState(initialPayments);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const handleAction = async (id: string, approved: boolean) => {
        const actionLabel = approved ? 'APROBAR' : 'RECHAZAR';
        if (!confirm(`¿Seguro que deseas ${actionLabel} este pago?`)) return;
        
        setLoadingId(id);
        try {
            const res = await fetch('/api/admin/billing/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId: id, approved })
            });
            
            if (res.ok) {
                setPayments(prev => prev.filter(p => p.id !== id));
            } else {
                alert("Error al procesar la solicitud.");
            }
        } catch (error) {
            console.error(error);
            alert("Error de red o conexión.");
        } finally {
            setLoadingId(null);
        }
    };

    if (payments.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[2rem] p-16 text-center shadow-sm flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-white/5 text-slate-400 rounded-full">
                    <Banknote size={36} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Sin pagos por verificar</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-sm">
                    Excelente trabajo. Todos los pagos de suscripciones se encuentran al día.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
                {payments.map(payment => (
                    <div key={payment.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-sm rounded-[2.5rem] p-6 lg:p-8 flex flex-col lg:flex-row justify-between items-stretch gap-8 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-black/20 transition-all duration-300">
                        {/* Información del negocio y pago */}
                        <div className="flex-1 flex flex-col justify-between space-y-4">
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="bg-amber-500/10 text-amber-500 font-black text-[9px] px-3 py-1 rounded-lg uppercase tracking-widest border border-amber-500/20 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                        Pendiente de Aprobación
                                    </span>
                                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(payment.fecha_pago).toLocaleString()}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-1">
                                    {payment.Negocio.nombre}
                                </h3>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                    Plan solicitado: <span className="text-slate-900 dark:text-slate-200">{plansMap[payment.plan_id] || payment.plan_id}</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-white/5 p-5 rounded-3xl border border-slate-100 dark:border-white/5 text-sm">
                                <div className="space-y-2">
                                    <p className="text-slate-500 dark:text-slate-400">
                                        <span className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">Método de pago</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            <Landmark size={14} className="text-emerald-500" />
                                            {payment.metodo_pago}
                                        </span>
                                    </p>
                                    {payment.referencia && (
                                        <p className="text-slate-500 dark:text-slate-400">
                                            <span className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">Nº de Referencia</span>
                                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-white/5 text-xs">
                                                {payment.referencia}
                                            </span>
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <p className="text-slate-500 dark:text-slate-400">
                                        <span className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">Monto del Pago</span>
                                        <span className="text-xl font-black text-slate-900 dark:text-white">
                                            ${payment.monto.toFixed(2)}
                                        </span>
                                    </p>
                                    {payment.comprobante && (
                                        <div>
                                            <span className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] block mb-1">Comprobante</span>
                                            <button 
                                                onClick={() => setViewingImage(payment.comprobante)}
                                                className="text-xs font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-1.5 bg-emerald-500/5 hover:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/10"
                                            >
                                                <Eye size={12} />
                                                Visualizar Comprobante
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex flex-col justify-center gap-3 min-w-[220px] border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-white/5 pt-6 lg:pt-0 lg:pl-8">
                            <button 
                                onClick={() => handleAction(payment.id, true)}
                                disabled={loadingId === payment.id}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest py-4.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                            >
                                {loadingId === payment.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Aprobar Pago
                            </button>
                            <button 
                                onClick={() => handleAction(payment.id, false)}
                                disabled={loadingId === payment.id}
                                className="w-full bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-500/5 dark:hover:bg-rose-500/10 text-rose-500 dark:text-rose-400 font-black text-xs uppercase tracking-widest py-4.5 rounded-2xl flex items-center justify-center gap-2 transition-all border border-rose-500/10 active:scale-95 disabled:opacity-50"
                            >
                                <X size={16} />
                                Rechazar Pago
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de visualización de comprobante */}
            {viewingImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setViewingImage(null)}>
                    <div className="relative bg-slate-900 border border-white/10 max-w-3xl w-full max-h-[85vh] rounded-[2.5rem] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/40">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-widest italic">Comprobante de Pago</h3>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">Revisa la autenticidad antes de aprobar</span>
                            </div>
                            <button 
                                onClick={() => setViewingImage(null)}
                                className="p-3 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 p-6 overflow-auto bg-slate-950 flex items-center justify-center min-h-[300px]">
                            {/* Visualizador de imagen / PDF */}
                            {viewingImage.startsWith('data:image') || viewingImage.startsWith('http') ? (
                                <img 
                                    src={viewingImage} 
                                    alt="Comprobante de Pago" 
                                    className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                                />
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="p-4 bg-white/5 rounded-full text-slate-400 inline-block">
                                        <Landmark size={32} />
                                    </div>
                                    <p className="text-slate-400 text-sm">El archivo no se puede renderizar directamente. Intenta descargarlo.</p>
                                    <a 
                                        href={viewingImage} 
                                        download="comprobante"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/10"
                                    >
                                        Abrir en nueva pestaña
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
