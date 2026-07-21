'use client';

import { useState, useEffect } from 'react';
import { 
    Clock, MapPin, Phone, ShoppingBag, MessageCircle, 
    CheckCircle2, AlertCircle, ChefHat, PackageCheck, Bike, HelpCircle
} from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
    id: string;
    nombreProducto: string;
    precioUnitario: number;
    cantidad: number;
}

interface Order {
    id: string;
    numeroPedido: number;
    tipoEntrega: string;
    nombreCliente: string;
    telefonoCliente: string;
    direccionCliente?: string | null;
    referenciaCliente?: string | null;
    fechaEntrega: string;
    franjaHoraria: string;
    subtotal: number;
    costoEnvio: number;
    total: number;
    estado: string;
    notas?: string | null;
    createdAt: string;
    items: OrderItem[];
}

interface Props {
    order: Order;
    negocio: {
        nombre: string;
        slug: string;
        whatsapp?: string | null;
        colorPrimario?: string | null;
    };
}

const ESTADOS_INFO = {
    RECIBIDO: { label: 'Recibido', color: 'bg-emerald-500', icon: Clock, desc: 'Tu pedido ha sido recibido y está en cola.' },
    PREPARACION: { label: 'En preparación', color: 'bg-amber-500', icon: ChefHat, desc: 'Estamos asando y preparando tus pinchos.' },
    LISTO: { label: 'Listo', color: 'bg-cyan-500', icon: PackageCheck, desc: 'Tu pedido está empacado y listo.' },
    RUTA: { label: 'En ruta', color: 'bg-indigo-500', icon: Bike, desc: 'El repartidor va en camino a tu domicilio.' },
    ENTREGADO: { label: 'Entregado', color: 'bg-emerald-600', icon: CheckCircle2, desc: '¡Pedido entregado! Buen provecho.' },
    CANCELADO: { label: 'Cancelado', color: 'bg-rose-600', icon: AlertCircle, desc: 'El pedido fue cancelado.' }
};

export default function OrderTrackingClient({ order: initialOrder, negocio }: Props) {
    const [order, setOrder] = useState<Order>(initialOrder);
    const primaryColor = negocio.colorPrimario || '#1dc95c';

    // Poll for status updates
    useEffect(() => {
        if (order.estado === 'ENTREGADO' || order.estado === 'CANCELADO') return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/public/${negocio.slug}/orders/${order.id}/status`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.estado && data.estado !== order.estado) {
                        setOrder(prev => ({ ...prev, estado: data.estado }));
                    }
                }
            } catch (err) {
                console.error("Error polling order status:", err);
            }
        }, 15000); // 15 seconds

        return () => clearInterval(interval);
    }, [order.id, order.estado, negocio.slug]);

    // Build timeline steps
    const isDelivery = order.tipoEntrega === 'DOMICILIO';
    const steps = isDelivery 
        ? ['RECIBIDO', 'PREPARACION', 'LISTO', 'RUTA', 'ENTREGADO']
        : ['RECIBIDO', 'PREPARACION', 'LISTO', 'ENTREGADO'];

    const currentStepIndex = steps.indexOf(order.estado);
    const isCancelled = order.estado === 'CANCELADO';

    // Build WhatsApp message for help
    const waPhone = negocio.whatsapp ? negocio.whatsapp.replace(/\D/g, '') : '';
    const waMessage = encodeURIComponent(`Hola ${negocio.nombre}, necesito ayuda con mi pedido #${order.numeroPedido}.`);
    const waLink = `https://wa.me/${waPhone}?text=${waMessage}`;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4 text-slate-800">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
                {/* Header */}
                <div className="text-center border-b border-slate-100 pb-5 mb-5">
                    <h1 className="text-xl font-black text-slate-900 tracking-tight mb-1">{negocio.nombre}</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seguimiento de Pedido</p>
                    <div className="mt-3 inline-block bg-slate-100 rounded-full px-4 py-1.5 text-xs font-black text-slate-700">
                        Pedido N° #{order.numeroPedido}
                    </div>
                </div>

                {/* Estado Actual */}
                {!isCancelled ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 text-left flex gap-3.5 items-start">
                        <div className="size-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                            {(() => {
                                const current = ESTADOS_INFO[order.estado as keyof typeof ESTADOS_INFO] || ESTADOS_INFO.RECIBIDO;
                                const Icon = current.icon;
                                return <Icon className="size-5 text-slate-700" />;
                            })()}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado Actual</p>
                            <h2 className="text-sm font-black text-slate-900 leading-snug">
                                {ESTADOS_INFO[order.estado as keyof typeof ESTADOS_INFO]?.label || order.estado}
                            </h2>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                                {ESTADOS_INFO[order.estado as keyof typeof ESTADOS_INFO]?.desc || ''}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl p-4 mb-6 text-left flex gap-3.5 items-start">
                        <AlertCircle className="size-6 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider">Pedido Cancelado</p>
                            <h2 className="text-sm font-black text-rose-900 leading-snug">El pedido ha sido cancelado</h2>
                            <p className="text-[11px] text-rose-600 font-medium leading-relaxed mt-0.5">
                                Si tienes dudas, por favor contáctanos al soporte de WhatsApp.
                            </p>
                        </div>
                    </div>
                )}

                {/* Timeline Visual (solo si no está cancelado) */}
                {!isCancelled && (
                    <div className="mb-8 px-2">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest text-left mb-6">Línea de Tiempo</h3>
                        <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                            {steps.map((stepKey, idx) => {
                                const stepInfo = ESTADOS_INFO[stepKey as keyof typeof ESTADOS_INFO];
                                const isDone = idx <= currentStepIndex;
                                const isCurrent = idx === currentStepIndex;
                                const Icon = stepInfo.icon;
                                
                                return (
                                    <div key={stepKey} className="flex gap-4 items-start relative text-left">
                                        <div className={`size-9 rounded-full flex items-center justify-center shrink-0 border-2 z-10 transition-all ${
                                            isCurrent 
                                                ? 'bg-slate-900 text-white border-slate-900 scale-110 shadow-lg shadow-slate-900/20' 
                                                : isDone 
                                                    ? 'bg-white text-slate-800 border-slate-800' 
                                                    : 'bg-white text-slate-300 border-slate-100'
                                        }`}>
                                            <Icon className="size-4" />
                                        </div>
                                        <div className="pt-1">
                                            <h4 className={`text-xs font-black uppercase tracking-wider ${
                                                isCurrent ? 'text-slate-900' : isDone ? 'text-slate-700' : 'text-slate-300'
                                            }`}>
                                                {stepInfo.label}
                                            </h4>
                                            {isCurrent && (
                                                <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                                                    {stepInfo.desc}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Detalles de Entrega */}
                <div className="bg-slate-50/50 border border-slate-100/80 rounded-2xl p-4 mb-6 text-left space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">
                        Detalles de la Entrega
                    </h3>
                    <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-700">
                        <Clock className="size-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha y Hora Programada</span>
                            <span>{order.fechaEntrega} | {order.franjaHoraria} hrs</span>
                        </div>
                    </div>
                    {isDelivery ? (
                        <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-700">
                            <MapPin className="size-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Dirección de Envío</span>
                                <span>{order.direccionCliente}</span>
                                {order.referenciaCliente && (
                                    <span className="text-[10px] text-slate-400 block mt-0.5">Ref: {order.referenciaCliente}</span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-700">
                            <MapPin className="size-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Lugar de Retiro</span>
                                <span>Retiro directo en nuestro local.</span>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-700">
                        <Phone className="size-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Contacto</span>
                            <span>{order.nombreCliente} ({order.telefonoCliente})</span>
                        </div>
                    </div>
                </div>

                {/* Resumen del Pedido */}
                <div className="bg-slate-50/50 border border-slate-100/80 rounded-2xl p-4 mb-6 text-left">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 mb-2.5">
                        Resumen de Compra
                    </h3>
                    <div className="divide-y divide-slate-100">
                        {order.items.map(item => (
                            <div key={item.id} className="py-2 flex justify-between items-center text-xs font-semibold">
                                <div className="text-slate-600">
                                    <span className="font-black text-slate-800">{item.cantidad}x</span> {item.nombreProducto}
                                </div>
                                <span className="font-black text-slate-800">${(item.precioUnitario * item.cantidad).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-slate-100 pt-3 mt-1 space-y-1 text-xs font-bold">
                        <div className="flex justify-between text-slate-400">
                            <span>Subtotal</span>
                            <span>${order.subtotal.toFixed(2)}</span>
                        </div>
                        {isDelivery && (
                            <div className="flex justify-between text-slate-400">
                                <span>Envío</span>
                                <span>${order.costoEnvio.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-black text-slate-800 pt-1.5 border-t border-slate-100/50">
                            <span>Total</span>
                            <span>${order.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Acciones */}
                <div className="space-y-3">
                    {negocio.whatsapp && (
                        <a 
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-transform rounded-2xl text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                            <MessageCircle className="size-4 shrink-0" />
                            Contactar por WhatsApp
                        </a>
                    )}
                    <Link 
                        href={`/${negocio.slug}`}
                        className="block w-full py-4 text-center text-xs font-black uppercase tracking-widest rounded-2xl text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-transform"
                    >
                        Volver al Catálogo
                    </Link>
                </div>
            </div>
        </div>
    );
}
