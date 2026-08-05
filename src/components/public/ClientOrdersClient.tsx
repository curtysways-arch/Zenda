'use client';

import React, { useState, useEffect } from 'react';
import {
    ShoppingBag,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Upload,
    FileText,
    Loader2,
    ArrowLeft,
    Phone,
    KeyRound,
    MapPin,
    DollarSign,
    Calendar,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { formatToEcuadorPhone } from '@/lib/phoneUtils';
import OrderTrackingClient from './OrderTrackingClient';

interface Order {
    id: string;
    numeroPedido: number;
    subtotal: number;
    costoEnvio: number;
    total: number;
    tipoEntrega: string;
    nombreCliente?: string;
    telefonoCliente?: string;
    direccionCliente?: string | null;
    referenciaCliente?: string | null;
    latitud?: number | null;
    longitud?: number | null;
    fechaEntrega: string;
    franjaHoraria: string;
    estado: string; // OrderStatus
    createdAt: string;
    items: Array<{
        id: string;
        nombreProducto: string;
        cantidad: number;
        precioUnitario: number;
    }>;
    payment?: {
        id: string;
        estado: string; // PaymentStatus
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
    negocio: any;
}

function formatShortDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
        const clean = String(dateStr).split('T')[0];
        const parts = clean.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return clean;
    } catch {
        return String(dateStr).split('T')[0];
    }
}

export default function ClientOrdersClient({ negocio }: Props) {
    const primaryColor = negocio?.colorPrimario || '#ff6b2b';
    const secondaryColor = negocio?.colorSecundario || '#1a0a00';

    const [phone, setPhone] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('pinchos_client_phone') || localStorage.getItem('user_phone') || '';
        }
        return '';
    });
    const [isVerified, setIsVerified] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('pinchos_client_phone') || localStorage.getItem('user_phone');
            return !!saved;
        }
        return false;
    });
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // OTP Verification State
    const [otpStep, setOtpStep] = useState<'input' | 'verify'>('input');
    const [otpCode, setOtpCode] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpMessage, setOtpMessage] = useState<string | null>(null);

    useEffect(() => {
        // Cargar teléfono guardado previamente en localStorage
        const savedPhone = phone || (typeof window !== 'undefined' ? (localStorage.getItem('pinchos_client_phone') || localStorage.getItem('user_phone')) : null);
        if (savedPhone) {
            setPhone(savedPhone);
            setIsVerified(true);
            fetchOrders(savedPhone);
        }
    }, []);

    const fetchOrders = async (clientPhone: string) => {
        try {
            setLoading(true);
            // Corrección: la ruta correcta es /orders, no /client-orders
            const res = await fetch(`/api/public/${negocio.slug}/orders?phone=${encodeURIComponent(clientPhone)}`);
            const data = await res.json();
            if (data.success || data.orders || data.pedidos) {
                const fetchedOrders = data.orders || data.pedidos || [];
                setOrders(fetchedOrders);
                // Si había un pedido seleccionado, actualizar sus datos
                if (selectedOrder) {
                    const updated = fetchedOrders.find((o: Order) => o.id === selectedOrder.id);
                    if (updated) setSelectedOrder(updated);
                }
            }
        } catch (error) {
            console.error('Error al consultar pedidos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone || phone.length < 8) {
            setOtpMessage('Ingresa un número de teléfono válido.');
            return;
        }

        try {
            setOtpLoading(true);
            setOtpMessage(null);
            const res = await fetch('/api/public/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send_otp', phone })
            });
            const data = await res.json();
            if (data.success) {
                setOtpStep('verify');
                setOtpMessage(data.message);
            } else {
                setOtpMessage(data.error || 'Error al enviar código OTP.');
            }
        } catch (error) {
            setOtpMessage('Error de red al enviar OTP.');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otpCode) {
            setOtpMessage('Ingresa el código OTP recibido.');
            return;
        }

        try {
            setOtpLoading(true);
            setOtpMessage(null);
            const res = await fetch('/api/public/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify_otp', phone, code: otpCode })
            });
            const data = await res.json();
            if (data.success) {
                const formattedPhone = formatToEcuadorPhone(phone);
                localStorage.setItem('pinchos_client_phone', formattedPhone);
                localStorage.setItem('user_phone', formattedPhone);
                setPhone(formattedPhone);
                setIsVerified(true);
                fetchOrders(formattedPhone);
            } else {
                setOtpMessage(data.error || 'Código incorrecto.');
            }
        } catch (error) {
            setOtpMessage('Error de red al verificar OTP.');
        } finally {
            setOtpLoading(false);
        }
    };

    const isShoeCare = negocio?.tipoNegocio === 'SHOE_CARE' || negocio?.slug?.includes('lavado') || negocio?.slug?.includes('sneaker');

    const getOrderBadge = (status: string) => {
        switch (status) {
            case 'EN_PREPARACION':
            case 'PREPARACION':
                return <span className="px-3 py-1 bg-purple-950 text-purple-300 border border-purple-800/60 rounded-full text-xs font-black">⚡ EN PROCESO</span>;
            case 'LISTO':
                return <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800/60 rounded-full text-xs font-black">✨ LISTO PARA ENTREGA</span>;
            case 'EN_RUTA':
            case 'RUTA':
                return <span className="px-3 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded-full text-xs font-black">🛵 EN CAMINO</span>;
            case 'ENTREGADO':
                return <span className="px-3 py-1 bg-emerald-900/50 text-emerald-300 border border-emerald-700/60 rounded-full text-xs font-black">🎉 ENTREGADO</span>;
            case 'PAGO_EN_REVISION':
                return <span className="px-3 py-1 bg-amber-950 text-amber-300 border border-amber-800/60 rounded-full text-xs font-black">⏳ PAGO EN REVISIÓN</span>;
            case 'PENDIENTE_PAGO':
            default:
                return <span className="px-3 py-1 bg-purple-950/80 text-purple-200 border border-purple-800/60 rounded-full text-xs font-black">💳 PENDIENTE DE PAGO</span>;
        }
    };

    // Si hay un pedido seleccionado, mostrar vista a pantalla completa con OrderTrackingClient
    if (selectedOrder) {
        return (
            <OrderTrackingClient
                order={selectedOrder}
                negocio={negocio}
                onBack={() => setSelectedOrder(null)}
                onRefreshOrders={() => fetchOrders(phone)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-36 sm:pb-40">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
                <Link href={`/${negocio.slug}`} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-xs font-extrabold uppercase tracking-wider">
                    <ArrowLeft className="w-4 h-4" /> Volver a Tienda
                </Link>
                <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-slate-800" style={{ color: primaryColor }} />
                    <span className="font-black text-sm text-slate-900">Mis Órdenes - {negocio.nombre}</span>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pt-8">
                {!isVerified ? (
                    // Card de Verificación OTP
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl space-y-6">
                        <div className="text-center space-y-2">
                            <div 
                                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-white shadow-md"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Phone className="w-7 h-7" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Consulta tus Órdenes de Servicio</h2>
                            <p className="text-xs text-slate-500 font-medium">Ingresa tu número de teléfono para enviarte un código OTP de seguridad</p>
                        </div>

                        {otpMessage && (
                            <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-center text-xs font-bold text-slate-800">
                                {otpMessage}
                            </div>
                        )}

                        {otpStep === 'input' ? (
                            <form onSubmit={handleSendOTP} className="space-y-4">
                                <div className="text-left">
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Número Celular / WhatsApp</label>
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        required
                                        autoFocus
                                        value={phone}
                                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                        placeholder="0991234567"
                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-mono text-center text-lg focus:outline-none focus:bg-white transition-colors"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={otpLoading}
                                    className="w-full py-4 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Código OTP'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOTP} className="space-y-4">
                                <div className="text-left">
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Código OTP de 6 dígitos</label>
                                    <div className="relative">
                                        <KeyRound className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            required
                                            autoFocus
                                            maxLength={6}
                                            value={otpCode}
                                            onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                            placeholder="123456"
                                            className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 rounded-2xl text-slate-900 font-mono text-center text-2xl tracking-[0.4em] focus:outline-none focus:bg-white transition-colors"
                                            style={{ borderColor: primaryColor }}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={otpLoading}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                                >
                                    {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar e Ingresar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOtpStep('input')}
                                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                                >
                                    Cambiar número de teléfono
                                </button>
                            </form>
                        )}
                    </div>
                ) : (
                    // Listado de Pedidos
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="text-left">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Consultando órdenes para</span>
                                <span className="text-sm font-black text-slate-900 font-mono">{phone}</span>
                            </div>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('pinchos_client_phone');
                                    setIsVerified(false);
                                }}
                                className="text-xs font-extrabold hover:underline cursor-pointer"
                                style={{ color: primaryColor }}
                            >
                                Cambiar número
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
                                <span className="ml-3 text-slate-500 text-xs font-bold">Buscando tus órdenes de servicio...</span>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 space-y-4 shadow-xs p-6">
                                <ShoppingBag className="w-12 h-12 mx-auto text-slate-300" />
                                <h3 className="text-base font-black text-slate-900">No tienes órdenes registradas</h3>
                                <p className="text-xs text-slate-500 font-medium">Solicita tu primer servicio de mantenimiento y lavado.</p>
                                <Link 
                                    href={`/${negocio.slug}`} 
                                    className="inline-block px-6 py-3 text-white text-xs font-black rounded-2xl shadow-md transition-colors"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    Solicitar Servicio
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map(order => {
                                    const extra = (order as any)?.extraInfo ? (typeof (order as any).extraInfo === 'string' ? JSON.parse((order as any).extraInfo) : (order as any).extraInfo) : {};
                                    const fotosEntrega: string[] = extra?.fotosEntrega || [];
                                    const isFinalizada = order.estado === 'ENTREGADO' || order.estado === 'LISTO';
                                    const previewFoto = fotosEntrega.length > 0 ? fotosEntrega[0] : null;

                                    return (
                                        <div 
                                            key={order.id} 
                                            onClick={() => setSelectedOrder(order)}
                                            className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.99] text-left"
                                        >
                                            {/* Header del pedido */}
                                            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                                                            Orden #{order.numeroPedido}
                                                        </span>
                                                        <span className="text-xs font-mono font-bold text-slate-400">
                                                            {formatShortDate(order.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                                        {order.tipoEntrega} • {order.fechaEntrega ? new Date(order.fechaEntrega).toLocaleDateString('es-EC', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'Por definir'}
                                                    </p>
                                                </div>
                                                <div>
                                                    {getOrderBadge(order.estado)}
                                                </div>
                                            </div>

                                            {/* Imagen del Resultado Final si está finalizado */}
                                            {isFinalizada && previewFoto && (
                                                <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-2xl flex items-center gap-3">
                                                    <img src={previewFoto} alt="Resultado Final" className="w-16 h-16 object-cover rounded-xl border border-purple-200 shrink-0 shadow-xs" />
                                                    <div>
                                                        <span className="text-[10px] font-black text-purple-900 uppercase tracking-widest block">✨ Cuidado Completado</span>
                                                        <p className="text-xs font-bold text-purple-950 mt-0.5">Tus artículos han sido restaurados con éxito.</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Lista de Ítems Resumida */}
                                            <div className="text-xs text-slate-600 font-medium line-clamp-2">
                                                {order.items.map(i => `${i.cantidad}x ${i.nombreProducto}`).join(', ')}
                                            </div>

                                            {/* Total & Botón de Ver Detalles */}
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                                <div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total a Pagar</span>
                                                    <span className="text-base font-black text-slate-900">${order.total.toFixed(2)}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="px-3.5 py-2 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    <span>Ver Detalles y Proceso</span>
                                                    <ChevronRight className="size-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
