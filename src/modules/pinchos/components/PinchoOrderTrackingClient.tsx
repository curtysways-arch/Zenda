'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, ChefHat, Bike, Package, XCircle, AlertCircle, CreditCard, RefreshCw, ExternalLink, Send, Wallet, ShieldCheck, UploadCloud, Copy, Check, Loader2, Info } from 'lucide-react';
import Step5PinchoPayment from './Step5PinchoPayment';

interface TimelineEntry {
    id: string;
    estadoAnterior?: string;
    estadoNuevo: string;
    comentario?: string;
    creadoPor: string;
    createdAt: string;
}

interface Props {
    order: any;
    timeline: TimelineEntry[];
    storeSlug: string;
}

const STATUS_MAP: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    PENDIENTE_PAGO: { icon: <Clock className="size-4" />, label: 'Pendiente de Pago', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    PAGO_INICIADO: { icon: <CreditCard className="size-4" />, label: 'Pago Iniciado', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    PAGO_EN_REVISION: { icon: <RefreshCw className="size-4 animate-spin" />, label: 'Comprobante en Revisión', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    COMPROBANTE_ENVIADO: { icon: <RefreshCw className="size-4 animate-spin" />, label: 'Comprobante Enviado', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    EN_PREPARACION: { icon: <ChefHat className="size-4" />, label: 'En Preparación', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    LISTO: { icon: <Package className="size-4" />, label: 'Listo para Entrega', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    EN_RUTA: { icon: <Bike className="size-4" />, label: 'En Camino', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    ENTREGADO: { icon: <CheckCircle2 className="size-4" />, label: 'Entregado', color: 'bg-green-100 text-green-800 border-green-200' },
    CANCELADO: { icon: <XCircle className="size-4" />, label: 'Cancelado', color: 'bg-rose-100 text-rose-800 border-rose-200' },
    PAGO_EXPIRADO: { icon: <AlertCircle className="size-4" />, label: 'Pedido Expirado', color: 'bg-slate-100 text-slate-600 border-slate-200' }
};

export default function PinchoOrderTrackingClient({ order: initialOrder, timeline: initialTimeline, storeSlug }: Props) {
    const [order, setOrder] = useState(initialOrder);
    const [bankConfig, setBankConfig] = useState<any>(null);
    const [showPaymentSection, setShowPaymentSection] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [reactivating, setReactivating] = useState(false);

    const isPendingPayment = order.estado === 'PENDIENTE_PAGO' || order.estado === 'PAGO_INICIADO';
    const isExpired = order.estado === 'PAGO_EXPIRADO';
    const statusInfo = STATUS_MAP[order.estado] || STATUS_MAP['PENDIENTE_PAGO'];
    const latestEvidence = order.payment?.evidences?.[0];

    // Fetch Bank details if pending payment
    useEffect(() => {
        if (isPendingPayment) {
            fetch(`/api/public/${storeSlug}/bank-details`)
                .then(r => r.json())
                .then(data => {
                    if (data.success && data.method) setBankConfig(data.method);
                })
                .catch(() => {});
        }
    }, [storeSlug, isPendingPayment]);

    // Handle Evidence Upload
    const handleUploadEvidence = async (file: File) => {
        try {
            setUploading(true);
            setUploadError(null);

            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`/api/public/${storeSlug}/orders/${order.id}/payment-evidence`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                setOrder((prev: any) => ({
                    ...prev,
                    estado: 'PAGO_EN_REVISION'
                }));
            } else {
                setUploadError(data.error || 'Error al subir comprobante.');
            }
        } catch (e) {
            setUploadError('Error de red al subir comprobante.');
        } finally {
            setUploading(false);
        }
    };

    // Handle Expiration Reactivation
    const handleReactivateOrder = async () => {
        try {
            setReactivating(true);
            const res = await fetch('/api/public/pinchos/orders/reactivate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pedidoId: order.id })
            });

            const data = await res.json();
            if (data.success && data.pedido) {
                setOrder(data.pedido);
            } else {
                alert(data.error || 'No se pudo reactivar el pedido.');
            }
        } catch (e) {
            alert('Error de conexión al reactivar.');
        } finally {
            setReactivating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-36 font-sans text-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 flex items-center justify-between shadow-2xs">
                <Link
                    href={`/${storeSlug}/pedidos`}
                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 hover:text-slate-900 bg-slate-100 px-3 py-2 rounded-xl"
                >
                    <ArrowLeft className="size-4" />
                    <span>Mis Pedidos</span>
                </Link>
                <span className="font-black text-sm text-slate-900">Seguimiento de Pedido</span>
            </header>

            <main className="max-w-xl mx-auto px-4 pt-6 space-y-5">
                {/* Status Badge */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider ${statusInfo.color}`}>
                        {statusInfo.icon}
                        <span>{statusInfo.label}</span>
                    </div>

                    <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Código del Pedido</span>
                        <span className="text-2xl font-mono font-black text-orange-600">{order.friendlyCode}</span>
                    </div>

                    <div className="flex justify-between text-xs border-t border-slate-100 pt-3">
                        <div className="text-left">
                            <span className="font-bold text-slate-500 text-[10px] uppercase">Cliente</span>
                            <p className="font-black text-slate-900">{order.nombreCliente}</p>
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-slate-500 text-[10px] uppercase">Total</span>
                            <p className="font-mono font-black text-orange-600 text-base">${order.total.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Reactivation Button if Expired */}
                {isExpired && (
                    <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 text-center space-y-3">
                        <div className="flex items-center justify-center gap-2 font-black text-rose-950 text-xs uppercase">
                            <AlertCircle className="size-5 text-rose-600" />
                            <span>Este pedido ha expirado por tiempo de espera</span>
                        </div>
                        <p className="text-xs text-rose-800 font-medium">
                            Puedes reactivarlo para mantener tus productos seleccionados e ingresar tu comprobante.
                        </p>
                        <button
                            type="button"
                            disabled={reactivating}
                            onClick={handleReactivateOrder}
                            className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {reactivating ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                            <span>REACTIVAR PEDIDO Y PAGAR DE NUEVO</span>
                        </button>
                    </div>
                )}

                {/* Payment Section - Embedded if Pending Payment */}
                {isPendingPayment && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <CreditCard className="size-4 text-orange-600" />
                                <span>Pagar Pedido #{order.friendlyCode}</span>
                            </span>
                        </div>

                        <Step5PinchoPayment
                            order={order}
                            bankConfig={bankConfig}
                            uploading={uploading}
                            uploadError={uploadError}
                            onUploadEvidence={handleUploadEvidence}
                        />
                    </div>
                )}

                {/* Order Items & Breakdown */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 text-left">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Detalle del Pedido</span>
                    
                    {/* Items List */}
                    <div className="divide-y divide-slate-100">
                        {order.items?.map((item: any) => (
                            <div key={item.id} className="py-2 flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-800">{item.cantidad}x {item.nombreProducto}</span>
                                <span className="font-mono font-black text-slate-900">${(item.precioUnitario * item.cantidad).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Breakdown: Subtotal, Shipping, Total */}
                    <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600 font-medium">
                            <span>Subtotal Productos</span>
                            <span className="font-mono text-slate-900">
                                ${((order.subtotal !== undefined && order.subtotal !== null) 
                                    ? order.subtotal 
                                    : (order.items?.reduce((acc: number, it: any) => acc + (it.precioUnitario * it.cantidad), 0) || 0)
                                ).toFixed(2)}
                            </span>
                        </div>

                        {order.tipoEntrega === 'DOMICILIO' && (
                            <div className="flex justify-between text-slate-600 font-medium">
                                <span className="flex items-center gap-1">
                                    <Bike className="size-3.5 text-orange-600" />
                                    <span>Costo de Envío (Domicilio)</span>
                                </span>
                                <span className="font-mono text-slate-900">
                                    ${((order.costoEnvio !== undefined && order.costoEnvio !== null)
                                        ? order.costoEnvio
                                        : (order.total - ((order.subtotal !== undefined && order.subtotal !== null) ? order.subtotal : (order.items?.reduce((acc: number, it: any) => acc + (it.precioUnitario * it.cantidad), 0) || 0)))
                                    ).toFixed(2)}
                                </span>
                            </div>
                        )}

                        {order.tipoEntrega === 'RETIRO' && (
                            <div className="flex justify-between text-slate-500 font-medium">
                                <span>Modalidad</span>
                                <span className="font-bold text-slate-700 uppercase text-[11px]">Retiro en Local ($0.00)</span>
                            </div>
                        )}

                        <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black">
                            <span className="text-slate-900">Total a Pagar</span>
                            <span className="text-orange-600 font-mono text-base">${order.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Delivery Address Details */}
                {order.tipoEntrega === 'DOMICILIO' && (
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-2 text-left">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block flex items-center gap-1.5">
                            <Bike className="size-3.5 text-orange-600" />
                            <span>Dirección de Entrega</span>
                        </span>
                        <p className="text-xs font-bold text-slate-900">{order.direccionCliente || 'Dirección de domicilio registrada'}</p>
                        {order.referenciaCliente && (
                            <p className="text-[11px] text-slate-500 font-medium">Ref: {order.referenciaCliente}</p>
                        )}
                        {order.latitud && order.longitud && (
                            <a
                                href={`https://maps.google.com/?q=${order.latitud},${order.longitud}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-800 pt-1"
                            >
                                <span>📍 Ver Ubicación en Google Maps</span>
                            </a>
                        )}
                    </div>
                )}


                {/* Payment Evidence Uploaded */}
                {latestEvidence && (
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-2 text-left">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Comprobante Adjunto</span>
                        <a
                            href={latestEvidence.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs font-black text-orange-600 hover:text-orange-800 underline underline-offset-2"
                        >
                            <ExternalLink className="size-4" />
                            <span>Ver Comprobante Subido</span>
                        </a>
                    </div>
                )}

                {/* Timeline */}
                {initialTimeline.length > 0 && (
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4 text-left">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Historial del Pedido</span>

                        <div className="relative pl-4 space-y-4">
                            <div className="absolute left-1.5 top-0 bottom-0 w-px bg-slate-200/80" />
                            {initialTimeline.map((entry, idx) => {
                                const statusData = STATUS_MAP[entry.estadoNuevo];
                                const isLast = idx === initialTimeline.length - 1;
                                return (
                                    <div key={entry.id} className="relative pl-5">
                                        <div className={`absolute -left-1 top-0.5 size-3 rounded-full border-2 ${isLast ? 'bg-orange-600 border-orange-600' : 'bg-white border-slate-300'}`} />
                                        <div>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusData?.color || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                {statusData?.label || entry.estadoNuevo}
                                            </span>
                                            {entry.comentario && (
                                                <p className="text-[10px] text-slate-500 font-medium mt-1">{entry.comentario}</p>
                                            )}
                                            <p className="text-[9px] text-slate-400 font-mono mt-1">
                                                {new Date(entry.createdAt).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                {' · '}{entry.creadoPor}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
