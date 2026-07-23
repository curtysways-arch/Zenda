'use client';

import { useState, useEffect } from 'react';
import { 
    Clock, MapPin, Phone, ShoppingBag, MessageCircle, 
    CheckCircle2, AlertCircle, ChefHat, PackageCheck, Bike,
    ArrowLeft, Upload, FileText, Loader2, XCircle, ShieldCheck, Flame, ExternalLink, Calendar
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface OrderItem {
    id: string;
    nombreProducto: string;
    precioUnitario: number;
    cantidad: number;
}

export interface Order {
    id: string;
    numeroPedido: number;
    tipoEntrega: string;
    nombreCliente?: string | null;
    telefonoCliente?: string | null;
    direccionCliente?: string | null;
    referenciaCliente?: string | null;
    latitud?: number | null;
    longitud?: number | null;
    fechaEntrega: string;
    franjaHoraria: string;
    subtotal: number;
    costoEnvio: number;
    total: number;
    estado: string;
    notas?: string | null;
    createdAt: string;
    items: OrderItem[];
    payment?: {
        id: string;
        estado: string;
        codigoPago?: string;
        motivoRechazo?: string;
        evidences?: Array<{
            id: string;
            fileUrl: string;
            fileType: string;
            createdAt: string;
        }>;
    };
}

interface Props {
    order: Order;
    negocio: {
        nombre: string;
        slug: string;
        whatsapp?: string | null;
        colorPrimario?: string | null;
    };
    onBack?: () => void;
    onRefreshOrders?: () => void;
}

function formatDeliveryDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Fecha por definir';
    try {
        const clean = String(dateStr).split('T')[0];
        const parts = clean.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) {
                const dayName = d.toLocaleDateString('es-EC', { weekday: 'long' });
                const monthName = d.toLocaleDateString('es-EC', { month: 'long' });
                const capDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                return `${capDay}, ${day} de ${capMonth} de ${year}`;
            }
        }
        return clean;
    } catch {
        return String(dateStr).split('T')[0];
    }
}

function getStepIndex(orderStatus: string, paymentStatus?: string): number {
    const s = (orderStatus || '').toUpperCase();
    const p = (paymentStatus || '').toUpperCase();

    if (s === 'ENTREGADO') return 5;
    if (s === 'RUTA' || s === 'EN_RUTA' || s === 'EN_CAMINO') return 4;
    if (s === 'LISTO') return 4;
    if (s === 'PREPARACION' || s === 'EN_PREPARACION') return 3;
    if (s === 'RECIBIDO' && p === 'CONFIRMADO') return 2;
    if (p === 'CONFIRMADO' || p === 'COMPROBANTE_ENVIADO') return 2;
    return 1;
}

export default function OrderTrackingClient({ order: initialOrder, negocio, onBack, onRefreshOrders }: Props) {
    const router = useRouter();
    const [order, setOrder] = useState<Order>(initialOrder);
    const [countdownTime, setCountdownTime] = useState<string>('');

    // Re-upload state
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

    const primaryColor = negocio.colorPrimario || '#ff6b2b';
    const isDelivery = order.tipoEntrega === 'DOMICILIO';
    const isCancelled = order.estado === 'CANCELADO' || order.estado === 'RECHAZADO';
    const stepIndex = getStepIndex(order.estado, order.payment?.estado);

    // Update internal state if prop updates
    useEffect(() => {
        setOrder(initialOrder);
    }, [initialOrder]);

    // Poll status updates
    useEffect(() => {
        if (isCancelled || order.estado === 'ENTREGADO') return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/public/${negocio.slug}/orders/${order.id}/status`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.estado && data.estado !== order.estado) {
                        setOrder(prev => ({ 
                            ...prev, 
                            estado: data.estado,
                            payment: data.payment ? { ...prev.payment, ...data.payment } : prev.payment 
                        }));
                        if (onRefreshOrders) onRefreshOrders();
                    }
                }
            } catch (err) {
                console.error("Error polling order status:", err);
            }
        }, 8000);

        return () => clearInterval(interval);
    }, [order.id, order.estado, negocio.slug, isCancelled]);

    // Countdown Timer
    useEffect(() => {
        if (!order.fechaEntrega || isCancelled || order.estado === 'ENTREGADO') return;

        const updateTimer = () => {
            const target = new Date(order.fechaEntrega).getTime();
            const now = new Date().getTime();
            const diff = target - now;

            if (diff <= 0) {
                if (['LISTO', 'RUTA', 'EN_CAMINO'].includes(order.estado)) {
                    setCountdownTime('¡En camino / Listo!');
                } else {
                    setCountdownTime('¡En preparación final!');
                }
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const hStr = hours < 10 ? `0${hours}` : `${hours}`;
            const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
            const sStr = seconds < 10 ? `0${seconds}` : `${seconds}`;

            if (days > 0) {
                setCountdownTime(`${days}d ${hStr}h ${mStr}m ${sStr}s`);
            } else {
                setCountdownTime(`${hStr}h ${mStr}m ${sStr}s`);
            }
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [order.fechaEntrega, isCancelled, order.estado]);

    // Subir comprobante
    const handleFileUpload = async (file: File) => {
        try {
            setUploading(true);
            setUploadError(null);
            setUploadSuccess(null);

            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`/api/public/${negocio.slug}/orders/${order.id}/payment-evidence`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                setUploadSuccess('¡Comprobante enviado a revisión exitosamente!');
                setOrder(prev => ({
                    ...prev,
                    payment: data.payment || { ...prev.payment, estado: 'COMPROBANTE_ENVIADO' }
                }));
                if (onRefreshOrders) onRefreshOrders();
            } else {
                setUploadError(data.error || 'Error al subir el comprobante.');
            }
        } catch (error: any) {
            setUploadError('Error de conexión al subir el comprobante.');
        } finally {
            setUploading(false);
        }
    };

    const handleBackClick = () => {
        if (onBack) {
            onBack();
        } else {
            router.push(`/${negocio.slug}/pedidos`);
        }
    };

    const waPhone = negocio.whatsapp ? negocio.whatsapp.replace(/\D/g, '') : '';
    const waMessage = encodeURIComponent(`Hola ${negocio.nombre}, necesito información de mi pedido #${order.numeroPedido}.`);
    const waLink = `https://wa.me/${waPhone}?text=${waMessage}`;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Top Bar Navigation */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 flex items-center justify-between shadow-2xs">
                <button
                    type="button"
                    onClick={handleBackClick}
                    className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-all cursor-pointer"
                >
                    <ArrowLeft className="size-4" />
                    <span>Volver</span>
                </button>

                <div className="text-center">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalles del Pedido</span>
                    <span className="text-sm font-black text-slate-900">Pedido #{order.numeroPedido}</span>
                </div>

                <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    isCancelled ? 'bg-rose-100 text-rose-800' : 'bg-orange-100 text-orange-800'
                }`}>
                    {order.estado}
                </span>
            </header>

            <main className="max-w-xl mx-auto px-4 pt-6 space-y-5">
                {/* Visual Timeline Progress Bar */}
                {!isCancelled ? (
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="size-4 text-orange-600 animate-pulse" />
                                <span>Progreso de Tu Pedido</span>
                            </h3>
                            <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200 uppercase tracking-wider">
                                Paso {stepIndex} de 5
                            </span>
                        </div>

                        <div className="pt-2 pb-1 px-1">
                            <div className="relative flex justify-between items-center">
                                {/* Track Line */}
                                <div className="absolute left-4 right-4 top-4 h-1 bg-slate-100 -z-0" />
                                {/* Active Fill Line */}
                                <div 
                                    className="absolute left-4 h-1 bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-500 -z-0" 
                                    style={{ width: `${Math.min(100, Math.max(0, ((stepIndex - 1) / 4) * 100))}%` }}
                                />

                                {/* Step Nodes */}
                                {[
                                    { step: 1, label: 'RECIBIDO', icon: FileText },
                                    { step: 2, label: 'PAGO', icon: ShieldCheck },
                                    { step: 3, label: 'PRODUCCIÓN', icon: Flame },
                                    { step: 4, label: isDelivery ? 'EN RUTA' : 'LISTO', icon: isDelivery ? Bike : PackageCheck },
                                    { step: 5, label: 'ENTREGADO', icon: CheckCircle2 }
                                ].map(item => {
                                    const isCompleted = item.step < stepIndex;
                                    const isCurrent = item.step === stepIndex;
                                    const Icon = item.icon;

                                    return (
                                        <div key={item.step} className="flex flex-col items-center z-10">
                                            <div className={`size-8 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                                                isCurrent
                                                    ? 'bg-orange-600 text-white font-black ring-4 ring-orange-200 scale-110 shadow-md animate-pulse'
                                                    : isCompleted
                                                        ? 'bg-emerald-600 text-white font-black shadow-2xs'
                                                        : 'bg-slate-100 text-slate-400 font-bold border border-slate-200'
                                            }`}>
                                                {isCompleted ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
                                            </div>
                                            <span className={`text-[8px] font-black uppercase tracking-wider mt-2 transition-colors ${
                                                isCurrent ? 'text-orange-600' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                                            }`}>
                                                {item.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-3xl p-5 flex items-start gap-3.5">
                        <AlertCircle className="size-6 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-rose-950">Pedido Cancelado o Rechazado</h3>
                            <p className="text-xs font-medium text-rose-800 mt-1 leading-relaxed">
                                Este pedido fue cancelado. Si tienes dudas, contáctanos por WhatsApp.
                            </p>
                        </div>
                    </div>
                )}

                {/* Tiempo de Entrega y Programación */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-5 space-y-3 text-left">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-amber-500 text-white rounded-2xl flex items-center justify-center font-black shadow-2xs">
                                <Clock className="size-5" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-amber-900/70 uppercase tracking-widest block">Programación de Entrega</span>
                                <span className="text-xs font-black text-amber-950">
                                    Fecha y Hora Exacta de Entrega
                                </span>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-amber-200/70 border border-amber-300/80 text-amber-950 text-[10px] font-black uppercase rounded-xl tracking-wider">
                            {order.tipoEntrega}
                        </span>
                    </div>

                    <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2 text-xs font-bold text-amber-950">
                        <Calendar className="size-4 text-amber-700 shrink-0" />
                        <span>Fecha: {formatDeliveryDate(order.fechaEntrega)}</span>
                    </div>

                    {countdownTime && (
                        <div className="bg-white/90 rounded-2xl p-3 border border-amber-200/80 flex items-center justify-between shadow-2xs">
                            <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">Tiempo Restante Estimado</span>
                            <span className="text-xs font-mono font-black text-orange-600">{countdownTime}</span>
                        </div>
                    )}
                </div>

                {/* Estado del Pago & Subida de Comprobante */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Estado del Pago</span>
                        <span className="text-xs font-mono font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {order.payment?.estado || 'PENDIENTE'}
                        </span>
                    </div>

                    {/* Si fue rechazado */}
                    {order.payment?.estado === 'RECHAZADO' && (
                        <div className="space-y-3 pt-1">
                            <div className="p-4 bg-rose-50 text-rose-800 text-xs rounded-2xl border border-rose-200 space-y-1">
                                <div className="font-black flex items-center gap-1.5 text-rose-700">
                                    <XCircle className="size-4" /> Comprobante Rechazado
                                </div>
                                <p className="font-medium"><strong>Motivo:</strong> {order.payment.motivoRechazo || 'El comprobante no era legible o correcto.'}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">Subir Nuevo Comprobante (PNG, JPG, PDF)</label>
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp, application/pdf"
                                    disabled={uploading}
                                    onChange={e => {
                                        if (e.target.files?.[0]) {
                                            handleFileUpload(e.target.files[0]);
                                        }
                                    }}
                                    className="w-full text-xs text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-orange-600 file:text-white hover:file:bg-orange-700 bg-slate-50 rounded-xl border border-slate-200 p-2 cursor-pointer"
                                />
                                {uploading && (
                                    <div className="flex items-center gap-2 text-xs text-orange-600 font-bold">
                                        <Loader2 className="size-4 animate-spin" /> Subiendo nuevo comprobante...
                                    </div>
                                )}
                                {uploadSuccess && (
                                    <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
                                        {uploadSuccess}
                                    </div>
                                )}
                                {uploadError && (
                                    <div className="p-3 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-200">
                                        {uploadError}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Si está en revisión */}
                    {(order.payment?.estado === 'COMPROBANTE_ENVIADO' || order.payment?.estado === 'PAGO_EN_REVISION') && (
                        <div className="p-4 bg-amber-50 text-amber-900 text-xs rounded-2xl border border-amber-200 flex items-start gap-3 font-medium">
                            <Clock className="size-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="leading-relaxed">
                                <strong className="block font-black text-amber-950">Comprobante en Verificación</strong>
                                <span>Tu comprobante fue recibido y está siendo validado por el comercio.</span>
                            </div>
                        </div>
                    )}

                    {/* Si está confirmado */}
                    {order.payment?.estado === 'CONFIRMADO' && (
                        <div className="p-4 bg-emerald-50 text-emerald-900 text-xs rounded-2xl border border-emerald-200 flex items-start gap-3 font-medium">
                            <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <strong className="block font-black text-emerald-950">¡Pago Confirmado!</strong>
                                <span>Tu pago ha sido validado correctamente.</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Dirección y GPS */}
                {isDelivery && (
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 text-left">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                            <MapPin className="size-4 text-orange-600" />
                            <span>Dirección de Entrega</span>
                        </h3>
                        <div className="text-xs font-semibold text-slate-800 space-y-1">
                            <p className="font-bold text-slate-900">{order.direccionCliente || 'No especificada'}</p>
                            {order.referenciaCliente && (
                                <p className="text-[11px] text-slate-500 font-medium">Ref: {order.referenciaCliente}</p>
                            )}
                        </div>
                        {order.latitud && order.longitud && (
                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${order.latitud},${order.longitud}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-2xs"
                            >
                                <ExternalLink className="size-4 text-emerald-600" />
                                <span>Ver Ubicación Exacta en Mapa GPS</span>
                            </a>
                        )}
                    </div>
                )}

                {/* Desglose de Productos */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 text-left">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                        <ShoppingBag className="size-4 text-orange-600" />
                        <span>Detalle de Productos</span>
                    </h3>
                    <div className="divide-y divide-slate-100">
                        {order.items.map(item => (
                            <div key={item.id} className="py-2.5 flex justify-between items-center text-xs font-semibold">
                                <span className="text-slate-700">
                                    <strong className="text-slate-950 font-black">{item.cantidad}x</strong> {item.nombreProducto}
                                </span>
                                <span className="font-black text-slate-900">${(item.cantidad * item.precioUnitario).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs font-bold">
                        <div className="flex justify-between text-slate-400">
                            <span>Subtotal</span>
                            <span>${order.subtotal.toFixed(2)}</span>
                        </div>
                        {isDelivery && (
                            <div className="flex justify-between text-slate-400">
                                <span>Costo de Envío</span>
                                <span>${order.costoEnvio.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-100">
                            <span>Total a Pagar</span>
                            <span className="text-base text-orange-600">${order.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Acciones & WhatsApp */}
                <div className="space-y-3 pt-2">
                    {negocio.whatsapp && (
                        <a 
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-transform rounded-2xl text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                        >
                            <MessageCircle className="size-4 shrink-0" />
                            <span>Ayuda por WhatsApp sobre este Pedido</span>
                        </a>
                    )}
                    <button 
                        type="button"
                        onClick={handleBackClick}
                        className="w-full py-3.5 text-center text-xs font-black uppercase tracking-widest rounded-2xl text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-transform cursor-pointer border border-slate-200"
                    >
                        Volver a Mis Pedidos
                    </button>
                </div>
            </main>
        </div>
    );
}

