import React from 'react';
import { AlertCircle, Clock, ChefHat, Bike, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface BannerProps {
    order: any;
    storeSlug: string;
    onContinuePayment?: () => void;
}

export default function PinchoSmartActiveOrderBanner({
    order,
    storeSlug,
    onContinuePayment
}: BannerProps) {
    if (!order) return null;

    const friendlyCode = order.friendlyCode || `PIN-${(250000 + (order.numeroPedido || 1))}`;
    const status = order.estado;
    const paymentStatus = order.payment?.estado;

    let bgClass = 'bg-amber-500 text-slate-950 border-amber-400';
    let icon = <AlertCircle className="size-5 text-slate-950 shrink-0 animate-bounce" />;
    let title = `🟡 Tienes un pedido pendiente de pago (${friendlyCode})`;
    let subtitle = 'Haz clic para revisar los datos bancarios y subir tu comprobante.';
    let buttonText = 'Continuar Pago';

    if (paymentStatus === 'COMPROBANTE_ENVIADO' || status === 'PAGO_EN_REVISION') {
        bgClass = 'bg-orange-500 text-white border-orange-400';
        icon = <Clock className="size-5 text-white shrink-0 animate-spin" />;
        title = `🟠 Tu comprobante está siendo revisado (${friendlyCode})`;
        subtitle = 'El establecimiento está validando tu pago para iniciar producción.';
        buttonText = 'Ver Estado';
    } else if (status === 'EN_PREPARACION' || status === 'PREPARANDO_PEDIDO') {
        bgClass = 'bg-blue-600 text-white border-blue-400';
        icon = <ChefHat className="size-5 text-white shrink-0 animate-pulse" />;
        title = `🔵 Estamos preparando tus pinchos (${friendlyCode})`;
        subtitle = 'Tus productos maridados se encuentran en producción.';
        buttonText = 'Ver Progreso';
    } else if (status === 'EN_RUTA' || status === 'RUTA') {
        bgClass = 'bg-purple-600 text-white border-purple-400';
        icon = <Bike className="size-5 text-white shrink-0 animate-bounce" />;
        title = `🚚 Tu pedido va en camino (${friendlyCode})`;
        subtitle = 'El repartidor se dirige hacia tu dirección de entrega.';
        buttonText = 'Rastrear En Envío';
    }

    return (
        <div className="max-w-xl mx-auto px-4 pt-3 pb-1">
            <div className={`rounded-2xl p-4 border shadow-md flex items-center justify-between gap-3 ${bgClass}`}>
                <div className="flex items-center gap-3 min-w-0">
                    {icon}
                    <div className="min-w-0 text-left">
                        <span className="text-xs font-black uppercase tracking-wider truncate block">{title}</span>
                        <p className="text-[10px] font-medium opacity-90 truncate">{subtitle}</p>
                    </div>
                </div>

                <Link
                    href={`/${storeSlug}/pedidos/${order.id}`}
                    onClick={() => {
                        if (onContinuePayment && (status === 'PENDIENTE_PAGO' || status === 'PAGO_INICIADO')) {
                            onContinuePayment();
                        }
                    }}
                    className="px-3.5 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-black uppercase tracking-wider shrink-0 flex items-center gap-1 border border-white/20 active:scale-95 transition-transform"
                >
                    <span>{buttonText}</span>
                    <ArrowRight className="size-3.5" />
                </Link>
            </div>
        </div>
    );
}
