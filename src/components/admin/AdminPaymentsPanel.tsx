'use client';

import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    Eye,
    FileText,
    Clock,
    AlertTriangle,
    Search,
    Filter,
    Loader2,
    X,
    MessageSquare,
    ChevronRight,
    ArrowUpRight,
    RefreshCcw
} from 'lucide-react';

interface Payment {
    id: string;
    pedidoId: string;
    monto: number;
    estado: string;
    codigoPago: string;
    motivoRechazo?: string;
    observaciones?: string;
    createdAt: string;
    pedido: {
        id: string;
        numeroPedido: number;
        nombreCliente: string;
        telefonoCliente: string;
        tipoEntrega: string;
        total: number;
        estado: string;
    };
    evidences: Array<{
        id: string;
        fileUrl: string;
        fileType: string;
        mimeType: string;
        createdAt: string;
    }>;
    history: Array<{
        id: string;
        estadoNuevo: string;
        observacion?: string;
        responsableNombre?: string;
        createdAt: string;
    }>;
}

export default function AdminPaymentsPanel() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [previewEvidence, setPreviewEvidence] = useState<{ url: string; type: string } | null>(null);
    
    // Acciones de modal
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [observationText, setObservationText] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    useEffect(() => {
        fetchPayments();
    }, [filterStatus]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const url = filterStatus !== 'ALL' ? `/api/admin/payments?estado=${filterStatus}` : '/api/admin/payments';
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setPayments(data.payments || []);
            }
        } catch (error) {
            console.error('Error al cargar pagos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPayment = async (paymentId: string) => {
        if (!confirm('¿Confirmar pago y pasar el pedido a producción (EN PREPARACIÓN)?')) return;

        try {
            setActionLoading(true);
            const res = await fetch('/api/admin/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId,
                    newStatus: 'CONFIRMADO',
                    observacion: 'Pago verificado y aprobado por el administrador.'
                })
            });

            const data = await res.json();
            if (data.success) {
                fetchPayments();
                if (selectedPayment?.id === paymentId) {
                    setSelectedPayment(null);
                }
            } else {
                alert(data.error || 'Error al confirmar pago.');
            }
        } catch (error) {
            alert('Error al procesar la solicitud.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectPayment = async () => {
        if (!selectedPayment) return;
        if (!rejectReason.trim()) {
            alert('Por favor ingresa el motivo del rechazo para informar al cliente.');
            return;
        }

        try {
            setActionLoading(true);
            const res = await fetch('/api/admin/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId: selectedPayment.id,
                    newStatus: 'RECHAZADO',
                    motivoRechazo: rejectReason,
                    observacion: `Rechazado: ${rejectReason}`
                })
            });

            const data = await res.json();
            if (data.success) {
                setShowRejectModal(false);
                setRejectReason('');
                setSelectedPayment(null);
                fetchPayments();
            } else {
                alert(data.error || 'Error al rechazar el pago.');
            }
        } catch (error) {
            alert('Error de red al rechazar el pago.');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredPayments = payments.filter(p => {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
            p.pedido.nombreCliente.toLowerCase().includes(query) ||
            p.pedido.telefonoCliente.includes(query) ||
            p.pedido.numeroPedido.toString().includes(query) ||
            (p.codigoPago && p.codigoPago.toLowerCase().includes(query));
        return matchesQuery;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'CONFIRMADO':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">CONFIRMADO</span>;
            case 'COMPROBANTE_ENVIADO':
            case 'EN_REVISION':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">COMPROBANTE EN REVISIÓN</span>;
            case 'RECHAZADO':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">RECHAZADO</span>;
            case 'PENDIENTE':
            default:
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">PENDIENTE DE PAGO</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Filtros */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        💳 Panel de Verificación de Pagos
                    </h1>
                    <p className="text-sm text-slate-400">Revisa comprobantes y aprueba pagos para enviar pedidos a producción en Pinchos</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchPayments}
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
                        title="Recargar pagos"
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Barra de Búsqueda y Pestañas */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                {/* Tabs de Filtro */}
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    {[
                        { id: 'ALL', label: 'Todos' },
                        { id: 'COMPROBANTE_ENVIADO', label: 'Por Revisar' },
                        { id: 'CONFIRMADO', label: 'Confirmados' },
                        { id: 'RECHAZADO', label: 'Rechazados' },
                        { id: 'PENDIENTE', label: 'Pendientes' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                                filterStatus === tab.id
                                    ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Buscador */}
                <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar por cliente, pedido o código..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                    />
                </div>
            </div>

            {/* Lista de Pagos */}
            {loading ? (
                <div className="flex items-center justify-center p-16 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    <span className="ml-3 text-slate-400">Cargando registros de pago...</span>
                </div>
            ) : filteredPayments.length === 0 ? (
                <div className="text-center p-16 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    <p className="text-base font-semibold text-slate-300">No se encontraron pagos en esta categoría</p>
                    <p className="text-xs text-slate-500 mt-1">Intenta seleccionar otro filtro o buscar con un término distinto.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredPayments.map(p => (
                        <div
                            key={p.id}
                            className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
                        >
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-black text-white">Pedido #{p.pedido.numeroPedido}</span>
                                    {getStatusBadge(p.estado)}
                                    <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">{p.codigoPago || p.id.slice(0, 8)}</span>
                                </div>
                                <div className="text-sm text-slate-300 flex items-center gap-4">
                                    <span>👤 <strong>{p.pedido.nombreCliente}</strong> ({p.pedido.telefonoCliente})</span>
                                    <span>🛵 <strong>{p.pedido.tipoEntrega}</strong></span>
                                    <span className="text-xs text-slate-500">🕒 {new Date(p.createdAt).toLocaleString()}</span>
                                </div>
                                {p.motivoRechazo && (
                                    <div className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                                        ❌ <strong>Motivo Rechazo:</strong> {p.motivoRechazo}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 uppercase font-semibold">Monto Total</div>
                                    <div className="text-xl font-extrabold text-orange-400">${p.monto.toFixed(2)}</div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Ver Comprobante */}
                                    {p.evidences && p.evidences.length > 0 && (
                                        <button
                                            onClick={() => {
                                                const lastEv = p.evidences[0];
                                                setPreviewEvidence({ url: lastEv.fileUrl, type: lastEv.fileType });
                                            }}
                                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
                                        >
                                            <Eye className="w-4 h-4 text-orange-400" />
                                            Ver Comprobante ({p.evidences.length})
                                        </button>
                                    )}

                                    {/* Botón Confirmar Pago */}
                                    {p.estado !== 'CONFIRMADO' && (
                                        <button
                                            onClick={() => handleConfirmPayment(p.id)}
                                            disabled={actionLoading}
                                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Aprobar Pago
                                        </button>
                                    )}

                                    {/* Botón Rechazar Pago */}
                                    {p.estado !== 'RECHAZADO' && p.estado !== 'CONFIRMADO' && (
                                        <button
                                            onClick={() => {
                                                setSelectedPayment(p);
                                                setShowRejectModal(true);
                                            }}
                                            className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Rechazar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Previsualizador de Comprobante */}
            {previewEvidence && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                📄 Comprobante de Pago Subido por el Cliente
                            </h3>
                            <button
                                onClick={() => setPreviewEvidence(null)}
                                className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950/50 min-h-[350px]">
                            {previewEvidence.type === 'PDF' || previewEvidence.url.endsWith('.pdf') ? (
                                <iframe
                                    src={previewEvidence.url}
                                    className="w-full h-[550px] rounded-xl border border-slate-800"
                                    title="Comprobante PDF"
                                />
                            ) : (
                                <img
                                    src={previewEvidence.url}
                                    alt="Comprobante de Pago"
                                    className="max-h-[550px] w-auto object-contain rounded-xl shadow-lg border border-slate-800"
                                />
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
                            <a
                                href={previewEvidence.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-orange-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                                Abrir en pestaña nueva <ArrowUpRight className="w-4 h-4" />
                            </a>
                            <button
                                onClick={() => setPreviewEvidence(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Rechazar Pago con Motivo */}
            {showRejectModal && selectedPayment && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-rose-400">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-lg font-bold text-white">Rechazar Comprobante de Pago</h3>
                        </div>

                        <p className="text-xs text-slate-300">
                            Ingresa el motivo exacto del rechazo. El cliente podrá ver este mensaje en su pantalla de <strong>'Mis Pedidos'</strong> y subir un nuevo comprobante.
                        </p>

                        <textarea
                            rows={3}
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Ej: El monto del comprobante no coincide con el total o la imagen no es legible..."
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                        />

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRejectPayment}
                                disabled={actionLoading}
                                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all"
                            >
                                {actionLoading ? 'Procesando...' : 'Confirmar Rechazo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
