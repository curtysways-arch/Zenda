"use client";

import { useState } from "react";
import {
    CheckCircle2,
    XCircle,
    Loader2,
    Building2,
    CreditCard,
    ArrowRight,
    Clock,
    Zap,
    Ban,
    RefreshCw,
    Banknote
} from "lucide-react";

interface Solicitud {
    id: string;
    negocioId: string;
    negocio: {
        id: string;
        nombre: string;
        slug?: string;
        email?: string;
        telefono?: string;
    };
    plan: {
        id: string;
        name: string;
        price: number;
    } | null;
    planSolicitado: {
        id: string;
        name: string;
        price: number;
    } | null;
    metodoPago: string | null;
    estado: string;
    updatedAt: string;
}

interface SolicitudesClientProps {
    solicitudes: Solicitud[];
}

export default function SolicitudesClient({ solicitudes: initialSolicitudes }: SolicitudesClientProps) {
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>(initialSolicitudes);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'APPROVE' | 'REJECT'; solicitud?: Solicitud } | null>(null);
    
    // Estados para el formulario de pago
    const [pagoReferencia, setPagoReferencia] = useState('');
    const [pagoMonto, setPagoMonto] = useState('');
    const [pagoNotas, setPagoNotas] = useState('');

    const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
        setProcessingId(id);

        try {
            const body: any = { action };
            if (action === 'APPROVE') {
                body.pagoReferencia = pagoReferencia;
                body.pagoMonto = parseFloat(pagoMonto) || 0;
                body.pagoNotas = pagoNotas;
            }

            const res = await fetch(`/api/superadmin/solicitudes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setSolicitudes(prev => prev.filter(s => s.id !== id));
                setConfirmAction(null);
                setPagoReferencia('');
                setPagoMonto('');
                setPagoNotas('');
            } else {
                const data = await res.json();
                alert(data.error || 'Error al procesar');
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión');
        } finally {
            setProcessingId(null);
        }
    };

    const getMetodoPagoIcon = (metodo: string | null) => {
        switch (metodo) {
            case 'transferencia': return <Banknote size={14} />;
            case 'tarjeta': return <CreditCard size={14} />;
            default: return <CreditCard size={14} />;
        }
    };

    const getMetodoPagoLabel = (metodo: string | null) => {
        if (!metodo) return 'Sin especificar';
        const cleanMetodo = metodo.split(' (')[0].toLowerCase(); // Limpiar el (ANNUAL)
        switch (cleanMetodo) {
            case 'transferencia': return 'Transferencia';
            case 'tarjeta': return 'Tarjeta de Crédito';
            default: return cleanMetodo.toUpperCase();
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);

        if (diffMins < 60) return `Hace ${diffMins}min`;
        if (diffHrs < 24) return `Hace ${diffHrs}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;
        return date.toLocaleDateString();
    };

    if (solicitudes.length === 0) {
        return (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-16 text-center">
                <div className="p-6 bg-emerald-50 text-emerald-300 rounded-[2rem] w-fit mx-auto mb-6">
                    <CheckCircle2 size={64} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                    Todo al día
                </h3>
                <p className="text-slate-400 max-w-md mx-auto font-medium">
                    No hay solicitudes de activación pendientes. Cuando un negocio solicite un cambio de plan, aparecerá aquí.
                </p>
            </div>
        );
    }

    return (
        <>
            {/* Confirm Modal */}
            {confirmAction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl my-auto animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className={`p-4 rounded-2xl ${confirmAction.action === 'APPROVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {confirmAction.action === 'APPROVE' ? <CheckCircle2 size={32} /> : <Ban size={32} />}
                                </div>
                                <button
                                    onClick={() => setConfirmAction(null)}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group"
                                >
                                    <XCircle size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
                                {confirmAction.action === 'APPROVE' ? 'Validar y Aprobar Pago' : 'Rechazar esta solicitud'}
                            </h3>
                            <p className="text-slate-500 font-medium mb-8">
                                {confirmAction.action === 'APPROVE'
                                    ? `Ingresa los detalles del pago recibido para el negocio ${confirmAction.solicitud?.negocio.nombre}.`
                                    : 'Indica si deseas descartar esta solicitud. El negocio mantendrá su plan actual.'
                                }
                            </p>

                            {confirmAction.action === 'APPROVE' && (
                                <div className="space-y-6">
                                    {/* Resumen de Plan */}
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between mb-8">
                                        <div className="text-xs">
                                            <span className="block text-slate-400 font-black uppercase tracking-widest mb-1 italic">Nuevo Plan</span>
                                            <span className="text-lg font-black text-slate-900">{confirmAction.solicitud?.planSolicitado?.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-slate-400 font-black uppercase tracking-widest mb-1 italic">Monto Sugerido</span>
                                            <span className="text-xl font-black text-indigo-600 text-lg decoration-emerald-500 underline decoration-2 underline-offset-4">${confirmAction.solicitud?.planSolicitado?.price}</span>
                                        </div>
                                    </div>

                                    {/* Formulario */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Referencia / Nro Op</label>
                                            <input
                                                type="text"
                                                autoFocus
                                                value={pagoReferencia}
                                                onChange={(e) => setPagoReferencia(e.target.value)}
                                                placeholder="Ej: TRX-998822"
                                                className="w-full px-4 py-3 bg-white !text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all font-bold placeholder:font-normal"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Monto Validado ($)</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={pagoMonto}
                                                onChange={(e) => setPagoMonto(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all !font-black !text-emerald-600"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Notas Internas</label>
                                        <textarea
                                            rows={2}
                                            value={pagoNotas}
                                            onChange={(e) => setPagoNotas(e.target.value)}
                                            placeholder="Detalles adicionales del pago..."
                                            className="w-full px-4 py-3 bg-white !text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all font-medium text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 mt-10">
                                <button
                                    onClick={() => setConfirmAction(null)}
                                    className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors flex-1"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleAction(confirmAction.id, confirmAction.action)}
                                    disabled={!!processingId || (confirmAction.action === 'APPROVE' && (!pagoReferencia || !pagoMonto))}
                                    className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 flex-[2] ${confirmAction.action === 'APPROVE'
                                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20'
                                        : 'bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-600/20'
                                        } ${(!pagoReferencia || !pagoMonto) && confirmAction.action === 'APPROVE' ? 'opacity-50 grayscale' : ''}`}
                                >
                                    {processingId ? <Loader2 size={18} className="animate-spin" /> : (confirmAction.action === 'APPROVE' ? 'Validar y Activar Plan' : 'Confirmar Rechazo')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Solicitudes Cards */}
            <div className="space-y-4">
                {solicitudes.map((sol) => (
                    <div
                        key={sol.id}
                        className="bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 overflow-hidden group"
                    >
                        <div className="p-6 md:p-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                {/* Left: Business Info */}
                                <div className="flex items-start gap-5 flex-1">
                                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-100 transition-colors shrink-0">
                                        <Building2 size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-lg font-black text-slate-900 truncate">
                                                {sol.negocio.nombre}
                                            </h4>
                                            <div className="shrink-0 px-3 py-1 bg-orange-100 text-orange-700 border border-orange-200 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                <Clock size={10} className="animate-pulse" />
                                                Pendiente
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-bold">
                                            {sol.negocio.email && <span>{sol.negocio.email}</span>}
                                            {sol.negocio.telefono && <span>{sol.negocio.telefono}</span>}
                                            <span className="text-slate-300">#{sol.negocioId.slice(0, 8)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Center: Plan Change */}
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-center">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Actual</div>
                                        <div className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider">
                                            {sol.plan?.name || 'Sin plan'}
                                        </div>
                                        <div className="text-xs font-black text-slate-400 mt-1">${sol.plan?.price || 0}/mes</div>
                                    </div>
                                    <ArrowRight size={20} className="text-indigo-400 mx-2" />
                                    <div className="text-center">
                                        <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Plan Solicitado</div>
                                        <div className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                                            <Zap size={12} className="text-amber-300 fill-amber-300" />
                                            {sol.planSolicitado?.name || 'Desconocido'}
                                        </div>
                                        {/* Badge de Periodo */}
                                        <div className="flex justify-center mt-1 gap-1 flex-wrap">
                                            <div className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                                                ${sol.planSolicitado?.price || 0}/mes
                                            </div>
                                            {(sol.metodoPago?.toUpperCase().includes('ANNUAL') || sol.metodoPago?.toUpperCase().includes('ANUAL')) && (
                                                <div className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                                                    Anual
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex items-center gap-3 shrink-0">
                                    <button
                                        onClick={() => setConfirmAction({ id: sol.id, action: 'REJECT', solicitud: sol })}
                                        disabled={!!processingId}
                                        className="px-4 py-3 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-colors border border-rose-100 flex items-center gap-2"
                                    >
                                        <XCircle size={16} />
                                        Rechazar
                                    </button>
                                    <button
                                        onClick={() => setConfirmAction({ id: sol.id, action: 'APPROVE', solicitud: sol })}
                                        disabled={!!processingId}
                                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-2 active:scale-95"
                                    >
                                        {processingId === sol.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <CheckCircle2 size={16} />
                                        )}
                                        Aprobar
                                    </button>
                                </div>
                            </div>

                            {/* Bottom Info Bar */}
                            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs">
                                <div className="flex items-center gap-2">
                                    {getMetodoPagoIcon(sol.metodoPago)}
                                    <span className="font-black text-slate-600 uppercase tracking-wider">
                                        {getMetodoPagoLabel(sol.metodoPago)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Clock size={14} />
                                    <span className="font-bold">{formatDate(sol.updatedAt)}</span>
                                </div>
                                {sol.planSolicitado && (
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <RefreshCw size={14} />
                                        <span className="font-bold">
                                            Incremento: +${(sol.planSolicitado.price - (sol.plan?.price || 0))}/mes
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
