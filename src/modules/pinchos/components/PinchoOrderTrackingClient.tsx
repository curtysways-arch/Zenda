'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, ChefHat, Bike, Package, XCircle, AlertCircle, CreditCard, RefreshCw, ExternalLink } from 'lucide-react';

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

export default function PinchoOrderTrackingClient({ order, timeline, storeSlug }: Props) {
    const statusInfo = STATUS_MAP[order.estado] || STATUS_MAP['PENDIENTE_PAGO'];
    const latestEvidence = order.payment?.evidences?.[0];

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

                {/* Order Items */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 text-left">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Detalle del Pedido</span>
                    <div className="divide-y divide-slate-100">
                        {order.items.map((item: any) => (
                            <div key={item.id} className="py-2 flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-800">{item.cantidad}x {item.nombreProducto}</span>
                                <span className="font-mono font-black text-slate-900">${(item.precioUnitario * item.cantidad).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-black">
                        <span className="text-slate-700">Total Pagado</span>
                        <span className="text-orange-600 font-mono">${order.total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Payment Evidence */}
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
                            <span>Ver Comprobante</span>
                        </a>
                    </div>
                )}

                {/* Timeline */}
                {timeline.length > 0 && (
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4 text-left">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Historial del Pedido</span>

                        <div className="relative pl-4 space-y-4">
                            <div className="absolute left-1.5 top-0 bottom-0 w-px bg-slate-200/80" />
                            {timeline.map((entry, idx) => {
                                const statusData = STATUS_MAP[entry.estadoNuevo];
                                const isLast = idx === timeline.length - 1;
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
