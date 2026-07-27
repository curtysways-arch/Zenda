import React from 'react';
import { Clock, CheckCircle2, FileText, ArrowRight, ShieldCheck } from 'lucide-react';

interface Step6Props {
    order: any;
    onViewOrder: () => void;
}

export default function Step6PinchoWaitingConfirmation({
    order,
    onViewOrder
}: Step6Props) {
    const friendlyCode = order.friendlyCode || `PIN-${(250000 + (order.numeroPedido || 1))}`;

    return (
        <div className="max-w-xl mx-auto space-y-5">
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-lg text-center space-y-5">
                <div className="size-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
                    <Clock className="size-10" />
                </div>

                <div className="space-y-1.5">
                    <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-[9px] font-black uppercase tracking-wider">
                        Pago en Verificación
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight pt-1">
                        ¡Comprobante Recibido!
                    </h2>
                    <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
                        Estamos verificando tu comprobante de pago. Una vez confirmado comenzaremos a preparar tus pinchos.
                    </p>
                </div>

                {/* Tarjeta con Código y Tiempo Estimado */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-left">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Código del Pedido</span>
                        <span className="font-mono font-black text-orange-600 text-sm">{friendlyCode}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                        <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Tiempo Estimado de Validación</span>
                        <span className="font-bold text-slate-900">5 a 15 minutos</span>
                    </div>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200/80 flex items-center gap-3 text-left">
                    <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                    <p className="text-xs font-bold text-emerald-950">
                        Te notificaremos automáticamente por WhatsApp tan pronto el pago sea validado.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onViewOrder}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                >
                    <span>VER DETALLES Y SEGUIMIENTO DEL PEDIDO</span>
                    <ArrowRight className="size-4" />
                </button>
            </div>
        </div>
    );
}
