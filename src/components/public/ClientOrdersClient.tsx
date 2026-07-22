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
    KeyRound
} from 'lucide-react';
import Link from 'next/link';

interface Order {
    id: string;
    numeroPedido: number;
    subtotal: number;
    costoEnvio: number;
    total: number;
    tipoEntrega: string;
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

export default function ClientOrdersClient({ negocio }: Props) {
    const primaryColor = negocio?.colorPrimario || '#ff6b2b';
    const secondaryColor = negocio?.colorSecundario || '#1a0a00';

    const [phone, setPhone] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);

    // OTP Verification State
    const [otpStep, setOtpStep] = useState<'input' | 'verify'>('input');
    const [otpCode, setOtpCode] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpMessage, setOtpMessage] = useState<string | null>(null);

    // Resubir comprobante
    const [uploadingForId, setUploadingForId] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

    useEffect(() => {
        // Cargar teléfono guardado previamente en localStorage
        const savedPhone = localStorage.getItem('pinchos_client_phone');
        if (savedPhone) {
            setPhone(savedPhone);
            setIsVerified(true);
            fetchOrders(savedPhone);
        }
    }, []);

    const fetchOrders = async (clientPhone: string) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/public/${negocio.slug}/client-orders?phone=${encodeURIComponent(clientPhone)}`);
            const data = await res.json();
            if (data.success) {
                setOrders(data.orders || []);
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
                localStorage.setItem('pinchos_client_phone', phone);
                setIsVerified(true);
                fetchOrders(phone);
            } else {
                setOtpMessage(data.error || 'Código incorrecto.');
            }
        } catch (error) {
            setOtpMessage('Error de red al verificar OTP.');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleFileUpload = async (orderId: string, file: File) => {
        try {
            setUploadingForId(orderId);
            setUploadError(null);
            setUploadSuccess(null);

            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`/api/public/${negocio.slug}/orders/${orderId}/payment-evidence`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                setUploadSuccess('¡Comprobante enviado a revisión con éxito!');
                fetchOrders(phone);
            } else {
                setUploadError(data.error || 'Error al subir el comprobante.');
            }
        } catch (error: any) {
            setUploadError('Error al procesar la subida del archivo.');
        } finally {
            setUploadingForId(null);
        }
    };

    const getOrderBadge = (status: string) => {
        switch (status) {
            case 'EN_PREPARACION':
                return <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-black animate-pulse">🔥 EN PREPARACIÓN</span>;
            case 'LISTO':
                return <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full text-xs font-black">✨ LISTO PARA ENTREGA</span>;
            case 'EN_RUTA':
                return <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-full text-xs font-black">🛵 EN RUTA</span>;
            case 'ENTREGADO':
                return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-black">🎉 ENTREGADO</span>;
            case 'PAGO_EN_REVISION':
                return <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-black">⏳ PAGO EN REVISIÓN</span>;
            case 'PENDIENTE_PAGO':
            default:
                return <span className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-xs font-black">💳 PENDIENTE DE PAGO</span>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans pb-16">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <Link href={`/${negocio.slug}`} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
                    <ArrowLeft className="w-4 h-4" /> Volver a Tienda
                </Link>
                <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-orange-500" />
                    <span className="font-extrabold text-sm text-white">Mis Pedidos - Pinchos</span>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pt-6">
                {!isVerified ? (
                    // Card de Verificación OTP
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-2xl flex items-center justify-center mx-auto">
                                <Phone className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-black text-white">Consulta tus Pedidos</h2>
                            <p className="text-xs text-slate-400">Ingresa tu número de teléfono para enviarte un código OTP de seguridad</p>
                        </div>

                        {otpMessage && (
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs font-semibold text-orange-400">
                                {otpMessage}
                            </div>
                        )}

                        {otpStep === 'input' ? (
                            <form onSubmit={handleSendOTP} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Número Celular / WhatsApp</label>
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="0991234567"
                                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-center text-lg focus:outline-none focus:border-orange-500 transition-colors"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={otpLoading}
                                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2"
                                >
                                    {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Código OTP'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOTP} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Código OTP de 4 dígitos</label>
                                    <div className="relative">
                                        <KeyRound className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            required
                                            maxLength={6}
                                            value={otpCode}
                                            onChange={e => setOtpCode(e.target.value)}
                                            placeholder="1234"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-center text-xl tracking-widest focus:outline-none focus:border-orange-500 transition-colors"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500 text-center mt-2">Prueba rápida en desarrollo: Usa <strong>1234</strong></p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={otpLoading}
                                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2"
                                >
                                    {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar e Ingresar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOtpStep('input')}
                                    className="w-full py-2 text-xs text-slate-400 hover:text-white"
                                >
                                    Cambiar número de teléfono
                                </button>
                            </form>
                        )}
                    </div>
                ) : (
                    // Listado de Pedidos
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
                            <div>
                                <span className="text-xs text-slate-400 block">Consultando pedidos para</span>
                                <span className="text-sm font-bold text-white font-mono">{phone}</span>
                            </div>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('pinchos_client_phone');
                                    setIsVerified(false);
                                }}
                                className="text-xs text-orange-400 hover:underline font-semibold"
                            >
                                Cambiar número
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                <span className="ml-3 text-slate-400 text-sm">Buscando tus pedidos...</span>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-16 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-3">
                                <ShoppingBag className="w-12 h-12 mx-auto text-slate-600" />
                                <h3 className="text-base font-bold text-slate-200">No tienes pedidos registrados</h3>
                                <p className="text-xs text-slate-400">Realiza tu primer pedido de pinchos para asar desde el catálogo.</p>
                                <Link href={`/${negocio.slug}`} className="inline-block px-5 py-2.5 bg-orange-500 text-white text-xs font-bold rounded-xl shadow-lg">
                                    Ver Catálogo de Pinchos
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map(order => (
                                    <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
                                        {/* Header del pedido */}
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-black text-white">Pedido #{order.numeroPedido}</span>
                                                    <span className="text-xs font-mono text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {order.tipoEntrega} ({order.franjaHoraria} hrs)
                                                </div>
                                            </div>
                                            <div>
                                                {getOrderBadge(order.estado)}
                                            </div>
                                        </div>

                                        {/* Lista de Ítems */}
                                        <div className="space-y-1.5 py-1">
                                            {order.items.map(item => (
                                                <div key={item.id} className="flex justify-between text-xs text-slate-300">
                                                    <span>{item.cantidad}x {item.nombreProducto}</span>
                                                    <span className="font-semibold text-slate-200">${(item.cantidad * item.precioUnitario).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Total */}
                                        <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-sm">
                                            <span className="text-slate-400 font-bold">Total a Pagar:</span>
                                            <span className="text-lg font-black text-orange-400">${order.total.toFixed(2)}</span>
                                        </div>

                                        {/* Sección del Pago */}
                                        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-semibold text-slate-400">Estado del Pago:</span>
                                                <span className="font-mono font-bold text-slate-200">{order.payment?.estado || 'PENDIENTE'}</span>
                                            </div>

                                            {/* Si fue rechazado: mostrar el motivo y formulario de re-subida */}
                                            {order.payment?.estado === 'RECHAZADO' && (
                                                <div className="space-y-3 pt-2 border-t border-rose-500/20">
                                                    <div className="p-3 bg-rose-500/10 text-rose-300 text-xs rounded-xl border border-rose-500/20 space-y-1">
                                                        <div className="font-bold flex items-center gap-1.5 text-rose-400">
                                                            <XCircle className="w-4 h-4" /> Comprobante Rechazado por Administrador
                                                        </div>
                                                        <p><strong>Motivo:</strong> {order.payment.motivoRechazo || 'El comprobante no era legible o correcto.'}</p>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Subir Nuevo Comprobante (PNG, JPG, PDF)</label>
                                                        <input
                                                            type="file"
                                                            accept="image/png, image/jpeg, image/webp, application/pdf"
                                                            disabled={uploadingForId === order.id}
                                                            onChange={e => {
                                                                if (e.target.files?.[0]) {
                                                                    handleFileUpload(order.id, e.target.files[0]);
                                                                }
                                                            }}
                                                            className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-500 file:text-white hover:file:bg-orange-600 bg-slate-900 rounded-xl border border-slate-800"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Si está en revisión */}
                                            {order.payment?.estado === 'COMPROBANTE_ENVIADO' && (
                                                <div className="p-3 bg-amber-500/10 text-amber-300 text-xs rounded-xl border border-amber-500/20 flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                                                    <span>Tu comprobante fue recibido y está siendo verificado. Tan pronto se confirme, tu pedido pasará a preparación.</span>
                                                </div>
                                            )}

                                            {/* Si está confirmado */}
                                            {order.payment?.estado === 'CONFIRMADO' && (
                                                <div className="p-3 bg-emerald-500/10 text-emerald-300 text-xs rounded-xl border border-emerald-500/20 flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                                    <span>¡Pago confirmado! Tu pedido ha ingresado a producción.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
