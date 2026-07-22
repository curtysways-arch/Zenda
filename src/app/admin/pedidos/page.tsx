'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Clock, ChefHat, PackageCheck, Bike, CheckCircle2, AlertCircle, 
    Loader2, Search, MapPin, Phone, Calendar, ClipboardList, ExternalLink, X, FileText, Image as ImageIcon, Check, Ban
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

    // Estado para edición de hora de entrega
    const [editingTimeSlot, setEditingTimeSlot] = useState('');
    const [editingDateTime, setEditingDateTime] = useState('');
    const [savingTime, setSavingTime] = useState(false);

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
                        setEditingTimeSlot(orderToHighlight.franjaHoraria || '');
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
        setEditingTimeSlot(order.franjaHoraria || '');
        if (order.fechaEntrega) {
            try {
                const dt = new Date(order.fechaEntrega);
                const iso = new Date(dt.getTime() - (dt.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                setEditingDateTime(iso);
            } catch (e) {
                setEditingDateTime('');
            }
        } else {
            setEditingDateTime('');
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            setUpdatingState(id);
            const res = await fetch('/api/admin/pedidos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, estado: newStatus, franjaHoraria: editingTimeSlot || undefined })
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

    const handleSaveTimeSlot = async () => {
        if (!selectedOrder) return;
        try {
            setSavingTime(true);
            const updatePayload: any = { id: selectedOrder.id, franjaHoraria: editingTimeSlot };
            if (editingDateTime) {
                updatePayload.fechaEntrega = new Date(editingDateTime).toISOString();
            }

            const res = await fetch('/api/admin/pedidos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });

            if (res.ok) {
                const updated = await res.json();
                setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, fechaEntrega: updated.fechaEntrega, franjaHoraria: updated.franjaHoraria } : o));
                setSelectedOrder(prev => prev ? { ...prev, fechaEntrega: updated.fechaEntrega, franjaHoraria: updated.franjaHoraria } : null);
                alert("Fecha y hora de entrega actualizadas exitosamente. El contador del cliente ha comenzado.");
            } else {
                alert("Error al actualizar la fecha y hora.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSavingTime(false);
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

            {/* Contenedor Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Listado */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
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
                                        className={`p-6 hover:bg-slate-50/50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 ${
                                            selectedOrder?.id === order.id ? 'border-orange-600 bg-orange-50/20' : 'border-transparent'
                                        }`}
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-black text-slate-900">Pedido #{order.numeroPedido}</span>
                                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                                    {order.tipoEntrega}
                                                </span>
                                                {getStatusBadge(order)}
                                            </div>

                                            <p className="text-xs font-black text-slate-800">{order.nombreCliente} ({order.telefonoCliente})</p>
                                            
                                            <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="size-3 text-orange-600" /> Entrega: {order.franjaHoraria || 'Sin asignar'}
                                                </span>
                                                {hasEvidence && (
                                                    <span className="flex items-center gap-1 text-emerald-600 font-black">
                                                        <FileText className="size-3" /> Comprobante Adjunto
                                                    </span>
                                                )}
                                            </div>

                                            {order.direccionCliente && (
                                                <p className="text-[10px] text-slate-500 font-medium truncate max-w-sm flex items-center gap-1">
                                                    <MapPin className="size-3 text-slate-400 shrink-0" /> {order.direccionCliente}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
                                            <span className="text-sm font-black text-slate-950">${order.total.toFixed(2)}</span>
                                            {nextAction && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUpdateStatus(order.id, nextAction.status);
                                                    }}
                                                    disabled={updatingState === order.id}
                                                    className={`px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl text-white transition-all shadow-md active:scale-95 disabled:opacity-50 ${nextAction.color}`}
                                                >
                                                    {updatingState === order.id ? '...' : nextAction.label}
                                                </button>
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

                {/* Detalles del Pedido Seleccionado */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm h-fit">
                    {selectedOrder ? (
                        <div className="space-y-6 text-left">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                <div>
                                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-widest">Detalles Pedido #{selectedOrder.numeroPedido}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedOrder.tipoEntrega}</span>
                                        {getStatusBadge(selectedOrder)}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELADO')}
                                    disabled={['ENTREGADO', 'CANCELADO'].includes(selectedOrder.estado)}
                                    className="px-3 py-1.5 border border-rose-100 text-rose-500 hover:bg-rose-50 rounded-xl text-[9px] font-black uppercase tracking-wider disabled:opacity-40"
                                >
                                    Cancelar
                                </button>
                            </div>

                            {/* Sección Asignación / Edición de Hora de Entrega */}
                            <div className="bg-orange-50/50 border border-orange-200/60 rounded-2xl p-4 space-y-3">
                                <label className="block text-[10px] font-black text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="size-3.5 text-orange-600" /> Asignar / Cambiar Hora de Entrega
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editingTimeSlot}
                                        onChange={e => setEditingTimeSlot(e.target.value)}
                                        placeholder="Ej: 14:00 - 15:00 hrs o 3 horas"
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-orange-500"
                                    />
                                    <button
                                        onClick={handleSaveTimeSlot}
                                        disabled={savingTime}
                                        className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shrink-0 transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {savingTime ? <Loader2 className="size-4 animate-spin" /> : 'Guardar Hora'}
                                    </button>
                                </div>
                            </div>

                            {/* Comprobante de Pago adjunto si existe */}
                            {selectedOrder.payment?.evidences && selectedOrder.payment.evidences.length > 0 && (
                                <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                                            <FileText className="size-4 text-emerald-600" /> Comprobante de Pago Subido
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-700 font-mono">
                                            ${selectedOrder.payment.monto.toFixed(2)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setPreviewEvidenceUrl(selectedOrder.payment!.evidences![0].fileUrl)}
                                        className="w-full py-2.5 bg-white border border-emerald-300 hover:bg-emerald-100/50 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                                    >
                                        <ImageIcon className="size-4 text-emerald-600" /> Ver Comprobante Adjunto
                                    </button>
                                </div>
                            )}

                            {/* Datos Cliente */}
                            <div className="space-y-2.5 text-xs">
                                <div className="flex gap-2.5 items-start">
                                    <ClipboardList className="size-4 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Cliente</span>
                                        <span className="font-bold text-slate-800">{selectedOrder.nombreCliente}</span>
                                        <span className="text-[10px] text-slate-400 block mt-0.5">Celular: {selectedOrder.telefonoCliente}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2.5 items-start bg-amber-50/60 p-3 rounded-2xl border border-amber-200/80">
                                    <Clock className="size-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="flex-1 space-y-1.5">
                                        <span className="text-[9px] font-black text-amber-900 uppercase tracking-wider block">Asignar Fecha y Hora Exacta de Entrega</span>
                                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                                            <input
                                                type="datetime-local"
                                                value={editingDateTime}
                                                onChange={(e) => setEditingDateTime(e.target.value)}
                                                className="bg-white border border-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs flex-1"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleSaveTimeSlot}
                                                disabled={savingTime}
                                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer"
                                            >
                                                {savingTime ? 'Guardando...' : 'Guardar'}
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-amber-800 font-medium">Esta fecha y hora inicia el contador regresivo en tiempo real en la pantalla del cliente.</p>
                                    </div>
                                </div>
                                {selectedOrder.direccionCliente && (
                                    <div className="flex gap-2.5 items-start">
                                        <MapPin className="size-4 text-slate-400 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Dirección</span>
                                            <span className="font-bold text-slate-800">{selectedOrder.direccionCliente}</span>
                                            {selectedOrder.referenciaCliente && (
                                                <span className="text-[10px] text-slate-400 block mt-0.5">Ref: {selectedOrder.referenciaCliente}</span>
                                            )}
                                            {selectedOrder.latitud && selectedOrder.longitud && (
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedOrder.latitud},${selectedOrder.longitud}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-indigo-600 mt-2 bg-indigo-50 px-2 py-1 rounded-lg"
                                                >
                                                    <ExternalLink className="size-3" />
                                                    Ver ubicación GPS en Mapa
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Productos Comprados */}
                            <div className="border-t border-slate-100 pt-4 space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items Comprados</h4>
                                <div className="divide-y divide-slate-100">
                                    {selectedOrder.items.map(item => (
                                        <div key={item.id} className="py-2 flex justify-between text-xs font-semibold">
                                            <div>
                                                <span className="font-black text-slate-900">{item.cantidad}x</span> {item.nombreProducto}
                                            </div>
                                            <span className="font-black text-slate-800">${(item.precioUnitario * item.cantidad).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totales y Botón Aprobar */}
                            <div className="border-t border-slate-100 pt-4 space-y-3">
                                <div className="space-y-1.5 text-xs font-bold text-slate-600">
                                    <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span>${selectedOrder.subtotal.toFixed(2)}</span>
                                    </div>
                                    {selectedOrder.tipoEntrega === 'DOMICILIO' && (
                                        <div className="flex justify-between">
                                            <span>Envío</span>
                                            <span>${selectedOrder.costoEnvio.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-100">
                                        <span>Total</span>
                                        <span>${selectedOrder.total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {getNextAction(selectedOrder) && (
                                    <button
                                        onClick={() => handleUpdateStatus(selectedOrder.id, getNextAction(selectedOrder)!.status)}
                                        disabled={updatingState === selectedOrder.id}
                                        className={`w-full py-3.5 text-xs font-black uppercase tracking-widest rounded-2xl text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${getNextAction(selectedOrder)!.color}`}
                                    >
                                        {updatingState === selectedOrder.id ? 'Actualizando...' : getNextAction(selectedOrder)!.label}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <ClipboardList className="size-12 text-slate-200 mx-auto mb-3" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Selecciona un Pedido</h3>
                            <p className="text-[11px] text-slate-400 font-medium">Haz click sobre cualquier pedido para ver los detalles completos y asignarle hora.</p>
                        </div>
                    )}
                </div>
            </div>
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
