'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Clock, ChefHat, PackageCheck, Bike, CheckCircle2, AlertCircle, 
    Loader2, Search, MapPin, Phone, Calendar, ClipboardList, ExternalLink, X, FileText, Image as ImageIcon, Check, Ban, ArrowLeft
} from 'lucide-react';

interface OrderItem {
    id: string;
    nombreProducto: string;
    precioUnitario: number;
    cantidad: number;
}

interface Evidence {
    id: string;
    fileUrl: string;
    fileType: string;
    createdAt: string;
}

interface OrderPayment {
    id: string;
    estado: string;
    codigoPago?: string;
    monto: number;
    evidences?: Evidence[];
}

interface Order {
    id: string;
    numeroPedido: number;
    tipoEntrega: string;
    nombreCliente: string;
    telefonoCliente: string;
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
    payment?: OrderPayment | null;
}

const TAB_STATES = {
    nuevos: ['RECIBIDO', 'PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'PAGO_CONFIRMADO', 'PENDIENTE'],
    preparacion: ['EN_PREPARACION', 'PREPARACION'],
    listos: ['LISTO', 'RUTA'],
    historial: ['ENTREGADO', 'CANCELADO', 'RECHAZADO']
};

function PedidosContent() {
    const searchParams = useSearchParams();
    const highlightId = searchParams.get('id');

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'nuevos' | 'preparacion' | 'listos' | 'historial'>('nuevos');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [updatingState, setUpdatingState] = useState<string | null>(null);

    // Modal de asignación de fecha y hora de entrega al confirmar pago
    const [confirmDateModalOrder, setConfirmDateModalOrder] = useState<Order | null>(null);
    const [modalDateTime, setModalDateTime] = useState('');
    const [modalTimeSlot, setModalTimeSlot] = useState('');
    const [submittingModal, setSubmittingModal] = useState(false);

    // Visor de comprobante
    const [previewEvidenceUrl, setPreviewEvidenceUrl] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/admin/pedidos');
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
                
                if (highlightId) {
                    const orderToHighlight = data.find((o: Order) => o.id === highlightId);
                    if (orderToHighlight) {
                        setSelectedOrder(orderToHighlight);
                        if (TAB_STATES.nuevos.includes(orderToHighlight.estado)) setActiveTab('nuevos');
                        else if (TAB_STATES.preparacion.includes(orderToHighlight.estado)) setActiveTab('preparacion');
                        else if (TAB_STATES.listos.includes(orderToHighlight.estado)) setActiveTab('listos');
                        else setActiveTab('historial');
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 15000); // Polling cada 15s
        return () => clearInterval(interval);
    }, [highlightId]);

    const handleSelectOrder = (order: Order) => {
        setSelectedOrder(order);
    };

    const openDateModalForOrder = (order: Order) => {
        setConfirmDateModalOrder(order);
        if (order.fechaEntrega) {
            try {
                const dt = new Date(order.fechaEntrega);
                const iso = new Date(dt.getTime() - (dt.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                setModalDateTime(iso);
            } catch (e) {
                setModalDateTime(new Date().toISOString().slice(0, 16));
            }
        } else {
            const now = new Date();
            now.setHours(now.getHours() + 2);
            const iso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setModalDateTime(iso);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        const targetOrder = orders.find(o => o.id === id);

        // Al aprobar/confirmar pago y pasar a producción, abrir modal de fecha y hora
        if (newStatus === 'PREPARACION' && targetOrder) {
            openDateModalForOrder(targetOrder);
            return;
        }

        try {
            setUpdatingState(id);
            const res = await fetch('/api/admin/pedidos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, estado: newStatus })
            });

            if (res.ok) {
                const updated = await res.json();
                setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
                if (selectedOrder?.id === id) {
                    setSelectedOrder(prev => prev ? { ...prev, ...updated } : null);
                }
            } else {
                alert("No se pudo actualizar el estado.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setUpdatingState(null);
        }
    };

    const handleConfirmApprovalWithDate = async () => {
        if (!confirmDateModalOrder || !modalDateTime) {
            alert("Por favor ingresa la fecha y hora de entrega.");
            return;
        }
        try {
            setSubmittingModal(true);
            const isoDate = new Date(modalDateTime).toISOString();
            const res = await fetch('/api/admin/pedidos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: confirmDateModalOrder.id,
                    estado: 'PREPARACION',
                    fechaEntrega: isoDate
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setOrders(prev => prev.map(o => o.id === confirmDateModalOrder.id ? { ...o, ...updated } : o));
                if (selectedOrder?.id === confirmDateModalOrder.id) {
                    setSelectedOrder(prev => prev ? { ...prev, ...updated } : null);
                }
                setConfirmDateModalOrder(null);
            } else {
                alert("Error al confirmar el pedido con la fecha de entrega.");
            }
        } catch (e) {
            console.error("Error approving order with date:", e);
        } finally {
            setSubmittingModal(false);
        }
    };

    // Filtered orders for active tab
    const activeStates = TAB_STATES[activeTab];
    const filteredOrders = orders.filter(o => activeStates.includes(o.estado));

    const getNextAction = (order: Order) => {
        switch (order.estado) {
            case 'PENDIENTE_PAGO':
            case 'PAGO_EN_REVISION':
            case 'PAGO_CONFIRMADO':
            case 'RECIBIDO':
            case 'PENDIENTE':
                return { label: 'Aprobar y Enviar a Preparación', status: 'PREPARACION', color: 'bg-emerald-600 hover:bg-emerald-700' };
            case 'EN_PREPARACION':
            case 'PREPARACION':
                return { label: 'Marcar Listo para Entrega', status: 'LISTO', color: 'bg-cyan-600 hover:bg-cyan-700' };
            case 'LISTO':
                if (order.tipoEntrega === 'DOMICILIO') {
                    return { label: 'Enviar a Domicilio (En Ruta)', status: 'RUTA', color: 'bg-indigo-600 hover:bg-indigo-700' };
                }
                return { label: 'Entregar Pedido', status: 'ENTREGADO', color: 'bg-emerald-600 hover:bg-emerald-700' };
            case 'RUTA':
                return { label: 'Marcar como Entregado', status: 'ENTREGADO', color: 'bg-emerald-600 hover:bg-emerald-700' };
            default:
                return null;
        }
    };

    const getStatusBadge = (order: Order) => {
        if (order.estado === 'PAGO_EN_REVISION') {
            return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[9px] font-black uppercase tracking-wider border border-amber-300">⌛ Comprobante por Verificar</span>;
        }
        if (order.estado === 'PENDIENTE_PAGO') {
            return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[9px] font-black uppercase tracking-wider">💳 Pendiente de Pago</span>;
        }
        if (['PREPARACION', 'EN_PREPARACION'].includes(order.estado)) {
            return <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-full text-[9px] font-black uppercase tracking-wider">🔥 En Producción</span>;
        }
        if (['LISTO', 'RUTA'].includes(order.estado)) {
            return <span className="px-2.5 py-0.5 bg-cyan-100 text-cyan-800 rounded-full text-[9px] font-black uppercase tracking-wider">🛵 Listo / Ruta</span>;
        }
        if (order.estado === 'ENTREGADO') {
            return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-black uppercase tracking-wider">🎉 Entregado</span>;
        }
        return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-wider">{order.estado}</span>;
    };

    return (
        <div className="space-y-6 text-left">
            {/* Modal de Vista Previa de Comprobante */}
            {previewEvidenceUrl && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <h3 className="font-black text-slate-900 text-sm">Comprobante de Pago Adjunto</h3>
                            <button onClick={() => setPreviewEvidenceUrl(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
                                <X className="size-5" />
                            </button>
                        </div>
                        {previewEvidenceUrl.endsWith('.pdf') ? (
                            <iframe src={previewEvidenceUrl} className="w-full h-96 rounded-2xl border border-slate-200" title="PDF Comprobante" />
                        ) : (
                            <img src={previewEvidenceUrl} alt="Comprobante" className="max-h-96 w-auto mx-auto rounded-2xl object-contain shadow-md border border-slate-100" />
                        )}
                        <div className="pt-2 text-right">
                            <a href={previewEvidenceUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2">
                                <ExternalLink className="size-4" /> Abrir en pantalla completa
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none italic uppercase">
                    Pedidos & Producción
                </h1>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                    Revisa comprobantes, aprueba pagos y asigna la hora de entrega
                </p>
            </div>

            {/* Pestañas (Tabs) */}
            <div className="flex gap-2 overflow-x-auto pb-1.5 border-b border-slate-100">
                {(['nuevos', 'preparacion', 'listos', 'historial'] as const).map(tab => {
                    const count = orders.filter(o => TAB_STATES[tab].includes(o.estado)).length;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab 
                                    ? 'bg-slate-900 text-white shadow-md' 
                                    : 'text-slate-400 bg-white border border-slate-100 hover:bg-slate-50'
                            }`}
                        >
                            {tab} ({count})
                        </button>
                    );
                })}
            </div>

            {/* ── VISTA PRINCIPAL: LISTADO DE PEDIDOS (SOLO LISTA) ── */}
            {!selectedOrder && (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="size-8 text-slate-300 animate-spin mb-3" />
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cargando pedidos...</span>
                        </div>
                    ) : filteredOrders.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {filteredOrders.map(order => {
                                const nextAction = getNextAction(order);
                                const hasEvidence = order.payment?.evidences && order.payment.evidences.length > 0;
                                
                                return (
                                    <div 
                                        key={order.id} 
                                        onClick={() => handleSelectOrder(order)}
                                        className="p-6 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group border-l-4 border-transparent hover:border-orange-500"
                                    >
                                        <div className="space-y-2 text-left">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-base font-black text-slate-900">Pedido #{order.numeroPedido}</span>
                                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                                                    {order.tipoEntrega}
                                                </span>
                                                {getStatusBadge(order)}
                                            </div>

                                            <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                                <span>{order.nombreCliente}</span>
                                                <span className="text-slate-400 font-semibold">({order.telefonoCliente})</span>
                                            </p>
                                            
                                            <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold flex-wrap">
                                                <span className="flex items-center gap-1 text-slate-600">
                                                    <Clock className="size-3.5 text-orange-600" /> Entrega: {order.fechaEntrega ? new Date(order.fechaEntrega).toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin asignar'}
                                                </span>
                                                {hasEvidence && (
                                                    <span className="flex items-center gap-1 text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                                        <FileText className="size-3" /> Comprobante Adjunto
                                                    </span>
                                                )}
                                            </div>

                                            {order.direccionCliente && (
                                                <p className="text-[10px] text-slate-500 font-medium truncate max-w-md flex items-center gap-1">
                                                    <MapPin className="size-3 text-slate-400 shrink-0" /> {order.direccionCliente}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                            <div className="text-left sm:text-right">
                                                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Total</span>
                                                <span className="text-lg font-black text-slate-950">${order.total.toFixed(2)}</span>
                                            </div>

                                            {nextAction ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUpdateStatus(order.id, nextAction.status);
                                                    }}
                                                    disabled={updatingState === order.id}
                                                    className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-2xl text-white transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer ${nextAction.color}`}
                                                >
                                                    {updatingState === order.id ? '...' : nextAction.label}
                                                </button>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase text-orange-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                    Ver Detalles →
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <ClipboardList className="size-12 text-slate-200 mx-auto mb-3" />
                            <h3 className="text-xs font-black text-slate-700 mb-1">Sin pedidos</h3>
                            <p className="text-[11px] text-slate-400 font-medium">No hay pedidos en la pestaña de {activeTab}.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── VISTA PANTALLA COMPLETA: GESTIÓN DE PEDIDO SELECCIONADO ── */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto pb-24 text-left animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Header Top Bar */}
                    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 flex items-center justify-between shadow-2xs">
                        <button
                            type="button"
                            onClick={() => setSelectedOrder(null)}
                            className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                        >
                            <ArrowLeft className="size-4" />
                            <span>Volver al Listado</span>
                        </button>

                        <div className="text-center">
                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestión de Pedido</span>
                            <span className="text-sm font-black text-slate-900">Pedido #{selectedOrder.numeroPedido}</span>
                        </div>

                        <button 
                            type="button"
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELADO')}
                            disabled={['ENTREGADO', 'CANCELADO'].includes(selectedOrder.estado)}
                            className="px-3 py-1.5 border border-rose-100 text-rose-500 hover:bg-rose-50 rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer"
                        >
                            Cancelar
                        </button>
                    </header>

                    {/* Contenido Detalle a Pantalla Completa */}
                    <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
                        {/* Cabecera Estado y Tipo */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tipo de Entrega</span>
                                <span className="text-sm font-black text-slate-900">{selectedOrder.tipoEntrega}</span>
                            </div>
                            <div>
                                {getStatusBadge(selectedOrder)}
                            </div>
                        </div>

                        {/* Comprobante de Pago adjunto si existe */}
                        {selectedOrder.payment?.evidences && selectedOrder.payment.evidences.length > 0 && (
                            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="size-5 text-emerald-600" /> Comprobante de Pago Subido
                                    </span>
                                    <span className="text-xs font-bold text-emerald-800 font-mono bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                                        ${selectedOrder.payment.monto.toFixed(2)}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setPreviewEvidenceUrl(selectedOrder.payment!.evidences![0].fileUrl)}
                                    className="w-full py-3 bg-white border border-emerald-300 hover:bg-emerald-100/50 text-emerald-950 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
                                >
                                    <ImageIcon className="size-4 text-emerald-600" /> Ver Comprobante Adjunto en Pantalla Completa
                                </button>
                            </div>
                        )}

                        {/* Entrega Programada */}
                        <div className="bg-orange-50/70 border border-orange-200/80 rounded-3xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-orange-950 uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="size-5 text-orange-600" /> Entrega Programada
                                </span>
                                <button
                                    type="button"
                                    onClick={() => openDateModalForOrder(selectedOrder)}
                                    className="text-xs font-black text-orange-700 hover:underline uppercase tracking-wider flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-xl border border-orange-200 cursor-pointer"
                                >
                                    <Calendar className="size-4 text-orange-600" /> Modificar Fecha
                                </button>
                            </div>
                            <div className="text-sm font-black text-slate-900 bg-white/90 p-3.5 rounded-2xl border border-orange-100">
                                {selectedOrder.fechaEntrega ? (
                                    <span>
                                        {new Date(selectedOrder.fechaEntrega).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                ) : (
                                    <span className="text-slate-400 italic">Por definir al confirmar pago</span>
                                )}
                            </div>
                        </div>

                        {/* Datos del Cliente */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2.5">
                                Información del Cliente
                            </h3>
                            <div className="space-y-3 text-xs">
                                <div className="flex gap-3 items-start">
                                    <ClipboardList className="size-4 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nombre</span>
                                        <span className="font-bold text-slate-900 text-sm">{selectedOrder.nombreCliente}</span>
                                        <span className="text-xs text-slate-500 font-semibold block mt-0.5">Celular: {selectedOrder.telefonoCliente}</span>
                                    </div>
                                </div>
                                {selectedOrder.direccionCliente && (
                                    <div className="flex gap-3 items-start border-t border-slate-100 pt-3">
                                        <MapPin className="size-4 text-slate-400 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dirección de Entrega</span>
                                            <span className="font-bold text-slate-900">{selectedOrder.direccionCliente}</span>
                                            {selectedOrder.referenciaCliente && (
                                                <span className="text-xs text-slate-500 font-medium block mt-0.5">Ref: {selectedOrder.referenciaCliente}</span>
                                            )}
                                            {selectedOrder.latitud && selectedOrder.longitud && (
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedOrder.latitud},${selectedOrder.longitud}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-indigo-600 mt-2.5 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200/80 transition-colors"
                                                >
                                                    <ExternalLink className="size-3.5" />
                                                    Ver Ubicación GPS en Mapa
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Productos Comprados */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2.5">
                                Items Comprados
                            </h4>
                            <div className="divide-y divide-slate-100">
                                {selectedOrder.items.map(item => (
                                    <div key={item.id} className="py-2.5 flex justify-between text-xs font-semibold">
                                        <div>
                                            <span className="font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md mr-1.5">{item.cantidad}x</span>
                                            <span className="text-slate-900 font-bold">{item.nombreProducto}</span>
                                        </div>
                                        <span className="font-black text-slate-950">${(item.precioUnitario * item.cantidad).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Totales y Botón de Acción Principal */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                            <div className="space-y-2 text-xs font-bold text-slate-600">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>${selectedOrder.subtotal.toFixed(2)}</span>
                                </div>
                                {selectedOrder.tipoEntrega === 'DOMICILIO' && (
                                    <div className="flex justify-between">
                                        <span>Costo de Envío</span>
                                        <span>${selectedOrder.costoEnvio.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-base font-black text-slate-950 pt-2.5 border-t border-slate-100">
                                    <span>Total A Pagar</span>
                                    <span className="text-orange-600">${selectedOrder.total.toFixed(2)}</span>
                                </div>
                            </div>

                            {getNextAction(selectedOrder) && (
                                <button
                                    onClick={() => handleUpdateStatus(selectedOrder.id, getNextAction(selectedOrder)!.status)}
                                    disabled={updatingState === selectedOrder.id}
                                    className={`w-full py-4 text-xs font-black uppercase tracking-widest rounded-2xl text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${getNextAction(selectedOrder)!.color}`}
                                >
                                    {updatingState === selectedOrder.id ? 'Actualizando...' : getNextAction(selectedOrder)!.label}
                                </button>
                            )}
                        </div>
                    </main>
                </div>
            )}

            {/* Modal de Asignación de Fecha y Hora al Confirmar Pago */}
            {confirmDateModalOrder && (
                <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 text-left">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="font-black text-slate-900 text-base uppercase tracking-tight">Asignar Fecha Exacta de Entrega</h3>
                                <p className="text-xs text-slate-500 font-bold mt-0.5">Pedido #{confirmDateModalOrder.numeroPedido} • {confirmDateModalOrder.nombreCliente}</p>
                            </div>
                            <button 
                                onClick={() => setConfirmDateModalOrder(null)} 
                                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 text-xs text-emerald-900 font-medium">
                                <p className="font-black text-emerald-950 flex items-center gap-1.5 mb-1">
                                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> ¡Confirmación de Pago y Producción!
                                </p>
                                <span>Selecciona la fecha y hora exacta de entrega. Esta fecha iniciará el contador regresivo en tiempo real para el cliente.</span>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                    📅 Fecha y Hora Exacta de Entrega
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={modalDateTime}
                                    onChange={(e) => setModalDateTime(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-xs"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmDateModalOrder(null)}
                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmApprovalWithDate}
                                disabled={submittingModal || !modalDateTime}
                                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {submittingModal ? <Loader2 className="size-4 animate-spin" /> : 'Guardar y Aprobar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminPedidos() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="size-8 text-slate-300 animate-spin" />
            </div>
        }>
            <PedidosContent />
        </Suspense>
    );
}
