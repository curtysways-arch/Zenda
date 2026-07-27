import React from 'react';
import { ShoppingBag, MapPin, User, Phone, Calendar, Clock, CreditCard, Loader2, ArrowRight } from 'lucide-react';
import { PinchoCartItem } from '../services/pinchoCartService';

interface Step4Props {
    items: PinchoCartItem[];
    clientName: string;
    clientPhone: string;
    deliveryType: 'RETIRO' | 'DOMICILIO';
    deliveryAddress: string;
    deliveryReference: string;
    shippingCost: number;
    subtotal: number;
    total: number;
    submitting: boolean;
    onCreateOrderAndProceedToPayment: () => void;
}

export default function Step4PinchoConfirm({
    items,
    clientName,
    clientPhone,
    deliveryType,
    deliveryAddress,
    deliveryReference,
    shippingCost,
    subtotal,
    total,
    submitting,
    onCreateOrderAndProceedToPayment
}: Step4Props) {
    return (
        <div className="max-w-xl mx-auto space-y-5">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 text-left">
                <div className="border-b border-slate-100 pb-3">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <ShoppingBag className="size-4 text-orange-600" />
                        <span>Resumen del Pedido</span>
                    </span>
                </div>

                {/* Cliente */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                        <User className="size-4 text-orange-600" />
                        <span>{clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold pl-6">
                        <Phone className="size-3.5 text-slate-400" />
                        <span>{clientPhone}</span>
                    </div>
                </div>

                {/* Modalidad y Dirección */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase">
                        <MapPin className="size-4 text-orange-600" />
                        <span>{deliveryType === 'DOMICILIO' ? 'Entrega a Domicilio' : 'Retiro en Local'}</span>
                    </div>
                    {deliveryType === 'DOMICILIO' && (
                        <div className="pl-6 space-y-0.5 text-xs text-slate-600 font-medium">
                            <p className="font-bold text-slate-800">{deliveryAddress}</p>
                            {deliveryReference && <p className="text-[11px] text-slate-500">Ref: {deliveryReference}</p>}
                        </div>
                    )}
                </div>

                {/* Productos */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Detalle de Productos</span>
                    <div className="divide-y divide-slate-100">
                        {items.map((item) => (
                            <div key={item.product.id} className="py-2 flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-800">
                                    {item.quantity}x {item.product.nombre}
                                </span>
                                <span className="font-mono font-black text-slate-900">
                                    ${(item.product.precio * item.quantity).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totales */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Subtotal</span>
                        <span className="font-mono text-white">${subtotal.toFixed(2)}</span>
                    </div>
                    {deliveryType === 'DOMICILIO' && (
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Envío</span>
                            <span className="font-mono text-white">${shippingCost.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-800">
                        <span>Total a Pagar</span>
                        <span className="text-lg font-mono text-orange-400">${total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Botón Principal Registrar Pedido e Ir al Pago */}
                <button
                    type="button"
                    disabled={submitting}
                    onClick={onCreateOrderAndProceedToPayment}
                    className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="size-5 animate-spin" />
                            Registrando pedido...
                        </>
                    ) : (
                        <>
                            <CreditCard className="size-4" />
                            <span>CONTINUAR AL PAGO</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
