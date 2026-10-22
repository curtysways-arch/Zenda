'use client';

import { useState, useEffect } from 'react';
import { 
    Clock, MapPin, Phone, ShoppingBag, MessageCircle, 
    CheckCircle2, AlertCircle, ChefHat, PackageCheck, Bike,
    ArrowLeft, Upload, FileText, Loader2, XCircle, ShieldCheck, Flame, ExternalLink, Calendar,
    Copy, Building2, CreditCard, Hash, UploadCloud, Send, Lock, Wallet, User, Check, X, KeyRound
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
    extraInfo?: any;
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
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('es-EC', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return String(dateStr);
    } catch {
        return String(dateStr);
    }
}

function getStepIndex(orderStatus: string, paymentStatus?: string): number {
    const s = (orderStatus || '').toUpperCase();
    const p = (paymentStatus || '').toUpperCase();

    // Etapa 5: Entregado / Finalizado
    if (s === 'ENTREGADO' || s === 'ENTREGADA' || s === 'FINALIZADO' || s === 'FINALIZADA' || s === 'COMPLETED') return 5;

    // Etapa 4: En Ruta / Despacho / Listo
    if (
        s === 'ESPERANDO_CLIENTE' ||
        s === 'RUTA' || s === 'EN_RUTA' || s === 'EN_CAMINO' ||
        s === 'EN_RUTA_ENTREGA' || s === 'ESPERANDO_REPARTIDOR_ENTREGA' ||
        s === 'LISTO' || s === 'LISTO_PARA_ENTREGA'
    ) return 4;

    // Etapa 3: Taller / Producción / Lavado / Secado / Detallado
    if (
        s === 'PREPARACION' || s === 'EN_PREPARACION' || s === 'PREPARANDO' ||
        s === 'EN_PROCESO' || s === 'PROCESO' || s === 'TALLER' || s === 'EN_TALLER' ||
        s === 'RECIBIDO' || s === 'RECIBIDA' ||
        s === 'INSPECCIONADO' || s === 'INSPECCION' ||
        s === 'LAVANDO' || s === 'EN_LAVADO' ||
        s === 'SECANDO' || s === 'EN_SECADO' ||
        s === 'DETALLADO' || s === 'EN_ACABADOS' || s === 'DETALLANDO' ||
        s === 'CONTROL_CALIDAD' || s === 'TRATAMIENTO' || s === 'REPARACION'
    ) return 3;

    // Etapa 2: Aceptado / En Retiro / Pago Registrado
    if (
        s === 'ACEPTADO' || s === 'ACEPTADA' || s === 'CONFIRMED' ||
        s === 'RETIRO' || s === 'EN_RETIRO' || s === 'PENDIENTE_RETIRO' ||
        s === 'REPARTIDOR_EN_CAMINO' || s === 'ESPERANDO_REPARTIDOR_RETIRO' || s === 'ESPERANDO_ACEPTACION_REPARTIDOR' ||
        s === 'RECOGIDO' || s === 'RETIRADO' ||
        p === 'CONFIRMADO' || p === 'COMPROBANTE_RECIBIDO' || p === 'COMPROBANTE_ENVIADO' || p === 'CONTRA_ENTREGA' || p === 'PAGADO' || p === 'PAID'
    ) return 2;

    return 1;
}

function getProductionPhaseLabel(status: string): string | null {
    const s = (status || '').toUpperCase();
    const map: Record<string, string> = {
        'RECIBIDO': 'Recibido en Taller',
        'RECIBIDA': 'Recibido en Taller',
        'INSPECCIONADO': 'Inspección Inicial',
        'INSPECCION': 'Inspección Inicial',
        'EN_PROCESO': 'En Taller',
        'PROCESO': 'En Taller',
        'TALLER': 'En Taller',
        'EN_TALLER': 'En Taller',
        'LAVANDO': 'Lavado & Limpieza',
        'EN_LAVADO': 'Lavado & Limpieza',
        'SECANDO': 'Secado & Desinfección',
        'EN_SECADO': 'Secado & Desinfección',
        'DETALLADO': 'Detallado Final',
        'DETALLANDO': 'Detallado Final',
        'EN_ACABADOS': 'Acabados & Pulido',
        'CONTROL_CALIDAD': 'Control de Calidad',
        'TRATAMIENTO': 'Tratamiento Especial',
        'REPARACION': 'Restauración',
        'PREPARACION': 'En Preparación',
        'EN_PREPARACION': 'En Preparación'
    };
    return map[s] || null;
}

export default function OrderTrackingClient({ order: initialOrder, negocio, onBack, onRefreshOrders }: Props) {
    const router = useRouter();
    const [order, setOrder] = useState<Order>(initialOrder);
    const [countdownTime, setCountdownTime] = useState<string>('');

    // Re-upload & Payment Modal state
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [bankConfig, setBankConfig] = useState<any>(null);
    const [selectedTab, setSelectedTab] = useState<'STATUS' | 'PHOTOS'>('STATUS');
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);

    const primaryColor = negocio.colorPrimario || '#9333ea';

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
    const isDelivery = order.tipoEntrega === 'DOMICILIO';
    const isCancelled = order.estado === 'CANCELADO' || order.estado === 'RECHAZADO';
    const stepIndex = getStepIndex(order.estado, order.payment?.estado);

    // Extraer fotos de auditoría de extraInfo si existen
    const extraInfo = (order as any)?.extraInfo ? (typeof (order as any).extraInfo === 'string' ? JSON.parse((order as any).extraInfo) : (order as any).extraInfo) : {};
    const fotosRecepcion: string[] = extraInfo?.fotosRecepcion || [];
    const fotosProceso: string[] = extraInfo?.fotosProceso || [];
    const fotosEntrega: string[] = extraInfo?.fotosEntrega || [];
    const hasPhotos = fotosRecepcion.length > 0 || fotosProceso.length > 0 || fotosEntrega.length > 0;

    // Código PIN de entrega de 4 dígitos (determinista o desde extraInfo)
    const getDeliveryPin = () => {
        let dCode = extraInfo?.deliveryCode;
        if (!dCode && order.id) {
            let num = 0;
            const str = order.id + 'delivery';
            for (let i = 0; i < str.length; i++) num = (num * 31 + str.charCodeAt(i)) % 9000;
            dCode = String(1000 + Math.abs(num));
        }
        return dCode || '----';
    };
    const deliveryPin = getDeliveryPin();

    // Load Bank Details for Payment Modal
    useEffect(() => {
        const fetchBankDetails = async () => {
            try {
                const res = await fetch(`/api/public/${negocio.slug}/bank-details`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.method) {
                        setBankConfig(data.method);
                    }
                }
            } catch (err) {
                console.error("Error loading bank details in tracking:", err);
            }
        };
        fetchBankDetails();
    }, [negocio.slug]);

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
                    setCountdownTime('¡Listo para entrega!');
                } else {
                    setCountdownTime('¡En proceso final de cuidado!');
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

    const handleBackClick = () => {
        if (onBack) {
            onBack();
        } else {
            router.push(`/${negocio.slug}/pedidos`);
        }
    };

    const waPhone = negocio.whatsapp ? negocio.whatsapp.replace(/\D/g, '') : '';
    const waMessage = encodeURIComponent(`Hola ${negocio.nombre}, necesito información de mi orden #${order.numeroPedido}.`);
    const waLink = `https://wa.me/${waPhone}?text=${waMessage}`;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-36 sm:pb-40">
            {/* Top Bar Navigation limpia en fondo blanco */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 flex items-center justify-between shadow-xs">
                <button
                    type="button"
                    onClick={handleBackClick}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                >
                    <ArrowLeft className="size-4" />
                    <span>Volver</span>
                </button>

                <div className="text-center">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Orden de Servicio</span>
                    <span className="text-sm font-bold text-slate-900">Orden #{order.numeroPedido}</span>
                </div>

                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
 isCancelled ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-purple-50 text-purple-700 border-purple-200'
 }`}>
                    {order.estado}
                </span>
            </header>

            <main className="max-w-xl mx-auto px-4 pt-6 space-y-5">
                {/* Visual Banner Hero de Estado en Blanco */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3 relative overflow-hidden text-left">
                    <div 
                        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-15 pointer-events-none"
                        style={{ backgroundColor: primaryColor }}
                    />
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md font-bold"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <PackageCheck className="size-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wide block" style={{ color: primaryColor }}>
                                Servicio Profesional
                            </span>
                            <h2 className="text-lg font-bold text-slate-900">Orden de Cuidado #{order.numeroPedido}</h2>
                        </div>
                    </div>
                </div>

                {/* Navegación por pestañas: Estado & Auditoría de Fotos */}
                {hasPhotos && (
                    <div className="flex bg-slate-200/60 p-1.5 rounded-2xl border border-slate-200 gap-1.5">
                        <button
                            type="button"
                            onClick={() => setSelectedTab('STATUS')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
 selectedTab === 'STATUS'
 ? 'bg-white text-slate-900 shadow-sm'
 : 'text-slate-500 hover:text-slate-800'
 }`}
                        >
                            Seguimiento
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedTab('PHOTOS')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
 selectedTab === 'PHOTOS'
 ? 'bg-white text-slate-900 shadow-sm'
 : 'text-slate-500 hover:text-slate-800'
 }`}
                        >
                            <span>Auditoría de Fotos</span>
                            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-bold">
                                {fotosRecepcion.length + fotosProceso.length + fotosEntrega.length}
                            </span>
                        </button>
                    </div>
                )}

                {selectedTab === 'PHOTOS' && hasPhotos ? (
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-5 text-left">
                        {fotosRecepcion.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wide text-purple-700 flex items-center gap-2">
                                    <span>📸 Fotos de Recepción (Antes del Cuidado)</span>
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {fotosRecepcion.map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                            <img src={url} alt={`Recepción ${idx}`} className="w-full h-24 object-cover rounded-xl border border-slate-200 hover:scale-105 transition-transform" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {fotosProceso.length > 0 && (
                            <div className="space-y-3 pt-3 border-t border-slate-100">
                                <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-700 flex items-center gap-2">
                                    <span>⚡ Fotos de Proceso (En Taller)</span>
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {fotosProceso.map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                            <img src={url} alt={`Proceso ${idx}`} className="w-full h-24 object-cover rounded-xl border border-slate-200 hover:scale-105 transition-transform" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {fotosEntrega.length > 0 && (
                            <div className="space-y-3 pt-3 border-t border-slate-100">
                                <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-700 flex items-center gap-2">
                                    <span>✨ Fotos del Resultado (Listo para Entrega)</span>
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {fotosEntrega.map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                            <img src={url} alt={`Entrega ${idx}`} className="w-full h-24 object-cover rounded-xl border border-slate-200 hover:scale-105 transition-transform" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Banner Especial Repartidor en el Destino */}
                        {(order.estado === 'ESPERANDO_CLIENTE' || order.estado === 'WAITING_CLIENT') && (
                            <div className="bg-amber-400 text-slate-950 rounded-3xl p-5 shadow-lg border-2 border-amber-500 animate-pulse flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="p-3 bg-slate-950 text-amber-400 rounded-2xl shrink-0 font-bold shadow-md">
                                        <Bike className="size-7" />
                                    </div>
                                    <div className="text-left space-y-0.5">
                                        <h4 className="font-bold text-sm uppercase tracking-tight">🛵 ¡Tu repartidor ha llegado!</h4>
                                        <p className="text-xs font-bold text-slate-900 leading-snug">
                                            El repartidor ya se encuentra afuera de tu dirección con tu pedido. Por favor acércate a recibirlo.
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-slate-950 text-amber-400 px-4 py-2.5 rounded-2xl text-center shrink-0 border border-amber-500 w-full sm:w-auto shadow-md">
                                    <span className="text-xs font-bold uppercase tracking-wider block text-amber-400/80">Código PIN de Entrega</span>
                                    <span className="font-mono text-2xl font-bold tracking-wide">{deliveryPin}</span>
                                </div>
                            </div>
                        )}

                                                {/* CÓDIGO DE SEGURIDAD PARA RETIRO — Visible cuando el repartidor va a retirar calzado/prendas */}
                        {['REPARTIDOR_EN_CAMINO', 'ESPERANDO_REPARTIDOR_RETIRO', 'PENDIENTE_RETIRO'].includes(order.estado) && (
                            <div className="bg-gradient-to-br from-purple-700 via-indigo-800 to-purple-900 text-white rounded-3xl p-5 shadow-xl border-2 border-purple-400 space-y-3 text-left">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-purple-200 flex items-center gap-1.5">
                                        <KeyRound className="size-4 text-purple-200" />
                                        CÓDIGO DE SEGURIDAD PARA RETIRO
                                    </span>
                                    <span className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 bg-white/20 rounded-full text-white">
                                        Seguridad de tus Prendas
                                    </span>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-purple-950/40 p-4 rounded-2xl border border-purple-400/30">
                                    <div>
                                        <p className="text-xs text-white font-bold">
                                            🔒 Pídele este código de 4 dígitos a tu repartidor
                                        </p>
                                        <p className="text-xs text-purple-200 mt-0.5">
                                            Cuando el repartidor llegue a tu puerta, pídele que te dicte este código antes de entregarle tus prendas o zapatos.
                                        </p>
                                    </div>
                                    <div className="bg-white text-purple-950 font-mono font-bold text-3xl px-6 py-2 rounded-xl shadow-lg tracking-wide border-2 border-purple-300 shrink-0">
                                        {(() => {
                                            let pCode = extraInfo?.pickupCode;
                                            if (!pCode && order.id) {
                                                let num = 0; const str = order.id + 'pickup';
                                                for (let i = 0; i < str.length; i++) num = (num * 31 + str.charCodeAt(i)) % 9000;
                                                pCode = String(1000 + Math.abs(num));
                                            }
                                            return pCode;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CÓDIGO PIN DE CONFIRMACIÓN DE ENTREGA — Visible cuando el pedido está en camino o esperando entrega */}
                        {['EN_RUTA_ENTREGA', 'EN_CAMINO', 'EN_RUTA', 'ESPERANDO_CLIENTE', 'WAITING_CLIENT'].includes(order.estado) && (
                            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-5 shadow-xl border-2 border-emerald-400 space-y-3 text-left">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                                        <KeyRound className="size-4 text-emerald-200" />
                                        CÓDIGO PIN DE ENTREGA
                                    </span>
                                    <span className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 bg-white/20 rounded-full text-white">
                                        Seguridad de Entrega
                                    </span>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-950/40 p-4 rounded-2xl border border-emerald-400/30">
                                    <div>
                                        <p className="text-xs text-white font-bold">
                                            Dicta este código de 4 dígitos a tu repartidor
                                        </p>
                                        <p className="text-xs text-emerald-100 mt-0.5">
                                            El repartidor lo necesita para verificar y finalizar la entrega de tus prendas en puerta.
                                        </p>
                                    </div>
                                    <div className="bg-white text-emerald-950 font-mono font-bold text-3xl px-6 py-2 rounded-xl shadow-lg tracking-wide border-2 border-emerald-300 shrink-0">
                                        {deliveryPin}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Visual Timeline Progress Bar en Fondo Blanco */}
                        {!isCancelled ? (
                            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 text-left">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                        <Clock className="size-4" style={{ color: primaryColor }} />
                                        <span>Progreso de Tu Orden</span>
                                    </h3>
                                    <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100 uppercase tracking-wider">
                                        Etapa {stepIndex} de 5
                                    </span>
                                </div>

                                <div className="pt-2 pb-1 px-1">
                                    <div className="relative flex justify-between items-center">
                                        {/* Track Line */}
                                        <div className="absolute left-4 right-4 top-4 h-1 bg-slate-100 -z-0" />
                                        {/* Active Fill Line */}
                                        <div 
                                            className="absolute left-4 h-1 transition-all duration-500 -z-0" 
                                            style={{ 
                                                width: `${Math.min(100, Math.max(0, ((stepIndex - 1) / 4) * 100))}%`,
                                                backgroundColor: primaryColor
                                            }}
                                        />

                                        {/* Step Nodes */}
                                        {[
                                            { step: 1, label: 'RECIBIDO', icon: FileText },
                                            { step: 2, label: 'PAGO', icon: ShieldCheck },
                                            { step: 3, label: 'TALLER', icon: Flame },
                                            { step: 4, label: isDelivery ? 'EN RUTA' : 'LISTO', icon: isDelivery ? Bike : PackageCheck },
                                            { step: 5, label: 'ENTREGADO', icon: CheckCircle2 }
                                        ].map(item => {
                                            const isCompleted = item.step < stepIndex;
                                            const isCurrent = item.step === stepIndex;
                                            const Icon = item.icon;

                                            return (
                                                <div key={item.step} className="flex flex-col items-center z-10">
                                                    <div 
                                                        className={`size-8 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
 isCurrent
 ? 'text-white font-bold scale-110 shadow-md'
 : isCompleted
 ? 'bg-emerald-500 text-white font-bold'
 : 'bg-slate-100 text-slate-400 border border-slate-200'
 }`}
                                                        style={isCurrent ? { backgroundColor: primaryColor } : {}}
                                                    >
                                                        {isCompleted ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
                                                    </div>
                                                    <span className={`text-xs font-bold uppercase tracking-wider mt-2 transition-colors ${
 isCurrent ? 'text-slate-900 font-bold' : isCompleted ? 'text-emerald-700' : 'text-slate-400'
 }`}>
                                                        {item.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {stepIndex === 3 && getProductionPhaseLabel(order.estado) && (
                                    <div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-600"></span>
                                            </span>
                                            <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                                                Fase en Taller: {getProductionPhaseLabel(order.estado)}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-200/80 text-purple-800 uppercase tracking-wider">
                                            En Producción
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-3xl p-5 flex items-start gap-3.5">
                                <AlertCircle className="size-6 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">Orden Cancelada</h3>
                                    <p className="text-xs font-medium text-rose-700 mt-1 leading-relaxed">
                                        Esta orden fue cancelada. Si tienes alguna inquietud, contáctanos por WhatsApp.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Tiempo de Entrega y Programación */}
                        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-3 text-left">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 bg-purple-600 text-white rounded-2xl flex items-center justify-center font-bold shadow-md">
                                        <Clock className="size-5" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wide block">Compromiso de Entrega</span>
                                        <span className="text-xs font-bold text-white">
                                            Fecha Estimada de Entrega
                                        </span>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-purple-950 border border-purple-800 text-purple-300 text-xs font-bold uppercase rounded-xl tracking-wider">
                                    {order.tipoEntrega}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha Estimada de Entrega</p>
                                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Calendar className="size-4 text-slate-400" />
                                    <span>{formatDeliveryDate(order.fechaEntrega)}</span>
                                </p>
                            </div>

                            {countdownTime && !isCancelled && order.estado !== 'ENTREGADO' && (
                                <div className="p-3 bg-purple-50 text-purple-900 rounded-2xl border border-purple-100 flex items-center justify-between font-mono text-xs">
                                    <span className="font-bold uppercase tracking-wider text-xs">Tiempo Restante Estimado</span>
                                    <span className="font-bold text-sm">{countdownTime}</span>
                                </div>
                            )}
                        </div>

                        {/* Estado del Pago & Subida de Comprobante */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3 text-left">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Estado del Pago</span>
                                <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                                    {order.payment?.estado || 'PENDIENTE'}
                                </span>
                            </div>

                            {/* Si fue rechazado O si el pago está pendiente */}
                            {(!order.payment || order.payment.estado === 'PENDIENTE' || order.payment.estado === 'RECHAZADO' || order.estado === 'PENDIENTE_PAGO') && (
                                <div className="space-y-3 pt-1">
                                    {order.payment?.estado === 'RECHAZADO' ? (
                                        <div className="p-4 bg-rose-50 text-rose-800 text-xs rounded-2xl border border-rose-200 space-y-1">
                                            <div className="font-bold flex items-center gap-1.5 text-rose-700">
                                                <XCircle className="size-4" /> Comprobante Rechazado
                                            </div>
                                            <p className="font-medium"><strong>Motivo:</strong> {order.payment.motivoRechazo || 'El comprobante no era legible o correcto.'}</p>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-orange-50/80 text-orange-950 text-xs rounded-2xl border border-orange-200/80 space-y-1">
                                            <div className="font-bold flex items-center gap-1.5 text-orange-800 uppercase tracking-wider text-xs">
                                                <AlertCircle className="size-4 text-orange-600 shrink-0" /> {stepIndex >= 3 ? 'Pago Pendiente de Verificación' : 'Pago Pendiente de Comprobante'}
                                            </div>
                                            <p className="font-medium text-slate-600 leading-relaxed">
                                                {stepIndex >= 3
                                                    ? 'Tu orden ya se encuentra en proceso en nuestro taller. Por favor adjunta o completa tu comprobante de pago para coordinar la entrega final.'
                                                    : 'Aún no se ha adjuntado el comprobante de pago para este pedido. Por favor sube tu comprobante para enviar a producción.'}
                                            </p>
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowPaymentModal(true)}
                                            className="w-full py-4 text-white font-bold rounded-2xl text-xs uppercase tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <Wallet className="size-4" />
                                            <span>Ver datos bancarios y subir comprobante</span>
                                        </button>

                                        {uploadSuccess && (
                                            <div className="mt-3 p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
                                                {uploadSuccess}
                                            </div>
                                        )}
                                        {uploadError && (
                                            <div className="mt-3 p-3 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-200">
                                                {uploadError}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Si está en revisión / comprobante recibido */}
                            {(order.payment?.estado === 'COMPROBANTE_RECIBIDO' || order.payment?.estado === 'COMPROBANTE_ENVIADO' || order.payment?.estado === 'PAGO_EN_REVISION') && (
                                <div className="p-4 bg-amber-50 text-amber-900 text-xs rounded-2xl border border-amber-200 flex items-start gap-3 font-medium">
                                    <Clock className="size-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="leading-relaxed">
                                        <strong className="block font-bold text-amber-950">Pedido recibido — esperando confirmación del pago</strong>
                                        <span>Tu comprobante fue adjuntado exitosamente y está siendo verificado por el negocio.</span>
                                    </div>
                                </div>
                            )}

                            {/* Si es contra entrega */}
                            {order.payment?.estado === 'CONTRA_ENTREGA' && (
                                <div className="p-4 bg-emerald-50 text-emerald-900 text-xs rounded-2xl border border-emerald-200 flex items-start gap-3 font-medium">
                                    <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                                    <div className="leading-relaxed">
                                        <strong className="block font-bold text-emerald-950">🟢 Pago Contra Entrega</strong>
                                        <span>Realizarás el pago en efectivo o POS al momento de recibir tu pedido.</span>
                                    </div>
                                </div>
                            )}

                            {/* Si está confirmado */}
                            {order.payment?.estado === 'CONFIRMADO' && (
                                <div className="p-4 bg-emerald-50 text-emerald-900 text-xs rounded-2xl border border-emerald-200 flex items-start gap-3 font-medium">
                                    <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="block font-bold text-emerald-950">¡Pago Confirmado!</strong>
                                        <span>Tu pago ha sido validado correctamente.</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Desglose de Productos */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3 text-left">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-2">
                                <ShoppingBag className="size-4" style={{ color: primaryColor }} />
                                <span>Detalle de Servicios Contratados</span>
                            </h3>
                            <div className="divide-y divide-slate-100">
                                {order.items.map(item => (
                                    <div key={item.id} className="py-2.5 flex justify-between items-center text-xs font-semibold">
                                        <span className="text-slate-700">
                                            <strong className="text-slate-900 font-bold">{item.cantidad}x</strong> {item.nombreProducto}
                                        </span>
                                        <span className="font-bold text-slate-900">${(item.cantidad * item.precioUnitario).toFixed(2)}</span>
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
                                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                                    <span>Total a Pagar</span>
                                    <span className="text-base" style={{ color: primaryColor }}>${order.total.toFixed(2)}</span>
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
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-transform rounded-2xl text-white text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                                >
                                    <MessageCircle className="size-4 shrink-0" />
                                    <span>Ayuda por WhatsApp sobre este Pedido</span>
                                </a>
                            )}
                            <button 
                                type="button"
                                onClick={handleBackClick}
                                className="w-full py-3.5 text-center text-xs font-bold uppercase tracking-wide rounded-2xl text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-transform cursor-pointer border border-slate-200"
                            >
                                Volver a Mis Órdenes
                            </button>
                        </div>
                    </>
                )}
            </main>

            {showPaymentModal && (
                <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm text-slate-900 flex flex-col justify-start items-center pb-12 overflow-y-auto animate-fade-in">
                    {/* Header Dinámico con Color de Marca */}
                    <header 
                        className="relative w-full max-w-lg pt-6 pb-12 px-6 flex items-center justify-between overflow-hidden shrink-0 shadow-lg text-white"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <button 
                            type="button"
                            onClick={() => setShowPaymentModal(false)}
                            className="relative z-10 size-10 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-white/20"
                            title="Volver"
                        >
                            <ArrowLeft className="size-5" />
                        </button>

                        <div className="relative z-10 flex items-center gap-2">
                            <span className="text-lg font-bold text-white tracking-tight ">{negocio.nombre}</span>
                        </div>

                        <button 
                            type="button"
                            onClick={() => setShowPaymentModal(false)}
                            className="relative z-10 size-10 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-white/20"
                            title="Cerrar"
                        >
                            <X className="size-5" />
                        </button>
                    </header>

                    {/* Hoja Blanca de Contenido Principal */}
                    <div className="relative z-20 w-full max-w-lg bg-slate-50 rounded-t-[36px] -mt-6 px-4 sm:px-6 py-6 border-t border-white/20 shadow-2xl space-y-5">
                        
                        {/* Título & Badges */}
                        <div className="text-center space-y-1.5 pb-1">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                <span 
                                    className="px-3 py-1 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    Paso Final
                                </span>
                                <span className="px-3 py-1 bg-slate-200 text-slate-800 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Transferencia Bancaria
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight pt-1">Completa tu pago</h2>
                            <div className="w-8 h-1 rounded-full mx-auto" style={{ backgroundColor: primaryColor }} />
                            <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto pt-0.5 leading-relaxed">
                                Transfiere el monto exacto y adjunta tu comprobante para enviar a producción.
                            </p>
                        </div>

                        {/* Tarjeta 1: Código de Pago y Monto a Transferir */}
                        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-2xs">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400 block">Código de Pago</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono font-bold text-slate-900 tracking-wider">
                                        {order.payment?.codigoPago || `PINCHOS-${order.id.slice(0, 6).toUpperCase()}`}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const code = order.payment?.codigoPago || `PINCHOS-${order.id.slice(0, 6).toUpperCase()}`;
                                            navigator.clipboard.writeText(code);
                                            setCopiedCode(true);
                                            setTimeout(() => setCopiedCode(false), 2000);
                                        }}
                                        className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all active:scale-95 cursor-pointer"
                                        title="Copiar código"
                                    >
                                        {copiedCode ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="h-10 w-px bg-slate-200 mx-1" />

                            <div className="flex items-center gap-3">
                                <div className="text-right space-y-0.5">
                                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400 block">Monto a Transferir</span>
                                    <span className="text-2xl font-bold text-slate-900 tracking-tight">${order.total.toFixed(2)}</span>
                                </div>
                                <div 
                                    className="size-11 text-white rounded-2xl flex items-center justify-center shadow-md shrink-0"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Wallet className="size-6" />
                                </div>
                            </div>
                        </div>

                        {/* Tarjeta 2: Datos para la Transferencia */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 text-left">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="size-10 text-white rounded-full flex items-center justify-center font-bold shadow-xs shrink-0"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <Building2 className="size-5" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Datos para la Transferencia</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{bankConfig?.banco || 'BANCO PICHINCHA'}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-1">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 bg-orange-100/70 text-orange-700 rounded-full flex items-center justify-center shrink-0">
                                        <User className="size-4" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Titular</span>
                                        <span className="text-xs font-bold text-slate-900">{bankConfig?.titular || 'Poleth Caicedo'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="size-8 bg-orange-100/70 text-orange-700 rounded-full flex items-center justify-center shrink-0">
                                        <CreditCard className="size-4" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tipo de cuenta</span>
                                        <span className="text-xs font-bold text-slate-900">{bankConfig?.tipoCuenta || 'Ahorros'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="size-8 bg-orange-100/70 text-orange-700 rounded-full flex items-center justify-center shrink-0">
                                        <Hash className="size-4" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-mono font-bold text-slate-900 select-all">{bankConfig?.numeroCuenta || '2213913435'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="size-8 bg-orange-100/70 text-orange-700 rounded-full flex items-center justify-center shrink-0">
                                        <FileText className="size-4" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Identificación / RUC</span>
                                        <span className="text-xs font-mono font-bold text-slate-900">{bankConfig?.identificacion || '1792345678001'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Formulario de Carga de Comprobante */}
                        {(order.payment?.evidences?.length > 0 || ['COMPROBANTE_ENVIADO', 'COMPROBANTE_RECIBIDO', 'PAGO_VERIFICADO', 'CONFIRMADO'].includes(order.payment?.estado || '')) ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 text-emerald-950 space-y-2">
                                <div className="flex items-center gap-2 font-bold text-xs text-emerald-800">
                                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                    <span>✅ Comprobante de pago registrado</span>
                                </div>
                                <p className="text-xs text-emerald-800 font-medium">
                                    Tu comprobante de pago ya ha sido recibido y registrado en el sistema. No necesitas volver a subir un archivo.
                                </p>
                            </div>
                        ) : (
                            <form 
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (evidenceFile) {
                                        await handleFileUpload(evidenceFile);
                                        setShowPaymentModal(false);
                                    }
                                }} 
                                className="space-y-4 pt-1"
                            >
                                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-md space-y-3">
                                    <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide">
                                        SUBIR COMPROBANTE (PNG, JPG, WEBP O PDF) *
                                    </label>

                                <div 
                                    onClick={() => document.getElementById('tracking-evidence-file-input')?.click()}
                                    className="border-2 border-dashed border-orange-300/80 hover:border-orange-500 bg-orange-50/30 hover:bg-orange-50/60 rounded-2xl p-4 flex items-center gap-3 transition-all cursor-pointer"
                                >
                                    <div className="size-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0 shadow-2xs">
                                        <UploadCloud className="size-5" />
                                    </div>
                                    
                                    <button
                                        type="button"
                                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                                    >
                                        Seleccionar archivo
                                    </button>

                                    <span className="text-xs font-semibold text-slate-500 truncate flex-1">
                                        {evidenceFile ? evidenceFile.name : 'Sin archivos seleccionados'}
                                    </span>

                                    <input
                                        id="tracking-evidence-file-input"
                                        type="file"
                                        required
                                        accept="image/png, image/jpeg, image/webp, application/pdf"
                                        onChange={e => {
                                            if (e.target.files?.[0]) setEvidenceFile(e.target.files[0]);
                                        }}
                                        className="hidden"
                                    />
                                </div>

                                <div className="bg-slate-100/80 rounded-2xl p-3.5 flex items-start gap-3 border border-slate-200/60">
                                    <ShieldCheck className="size-5 text-orange-600 shrink-0 mt-0.5" />
                                    <div className="text-xs text-slate-600 font-semibold leading-relaxed">
                                        <strong className="text-slate-800 block">Tu comprobante es 100% seguro.</strong>
                                        Solo se usa para validar tu pago y enviar tu pedido a producción.
                                    </div>
                                </div>
                            </div>

                            {uploadError && (
                                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold text-center">
                                    {uploadError}
                                </div>
                            )}

                            <div className="space-y-2 pt-1">
                                <button
                                    type="submit"
                                    disabled={uploading || !evidenceFile}
                                    className="w-full py-4 text-white font-bold rounded-2xl text-xs uppercase tracking-wide shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="size-5 animate-spin" />
                                            Enviando comprobante...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="size-4" />
                                            ENVIAR COMPROBANTE Y FINALIZAR
                                        </>
                                    )}
                                </button>
                                <div className="flex items-center justify-center gap-1.5 text-center pt-1">
                                    <Lock className="size-3 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-400">Tus datos están protegidos</span>
                                </div>
                            </div>
                        </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

