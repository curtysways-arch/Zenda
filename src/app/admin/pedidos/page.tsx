'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Clock, ChefHat, PackageCheck, Bike, CheckCircle2, AlertCircle, 
    Loader2, Search, MapPin, Phone, Calendar, ClipboardList, ExternalLink, X
} from 'lucide-react';

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
}

const TAB_STATES = {
    nuevos: ['RECIBIDO'],
    preparacion: ['PREPARACION'],
    listos: ['LISTO', 'RUTA'],
    historial: ['ENTREGADO', 'CANCELADO']
};

function PedidosContent() {
    const searchParams = useSearchParams();
    const highlightId = searchParams.get('id');

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'nuevos' | 'preparacion' | 'listos' | 'historial'>('nuevos');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [updatingState, setUpdatingState] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/admin/pedidos');
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
                
                // Si viene highlightId, auto-seleccionar ese pedido
                if (highlightId) {
                    const orderToHighlight = data.find((o: Order) => o.id === highlightId);
                    if (orderToHighlight) {
                        setSelectedOrder(orderToHighlight);
                        // Cambiar a la pestaña correspondiente
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
        const interval = setInterval(fetchOrders, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [highlightId]);

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            setUpdatingState(id);
            const res = await fetch('/api/admin/pedidos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, estado: newStatus })
            });

            if (res.ok) {
                // Actualizar localmente o refrescar
                const updated = await res.json();
                setOrders(prev => prev.map(o => o.id === id ? { ...o, estado: updated.estado } : o));
                if (selectedOrder?.id === id) {
                    setSelectedOrder(prev => prev ? { ...prev, estado: updated.estado } : null);
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

    // Filtered orders for active tab
    const activeStates = TAB_STATES[activeTab];
    const filteredOrders = orders.filter(o => activeStates.includes(o.estado));

    const getNextAction = (order: Order) => {
        switch (order.estado) {
            case 'RECIBIDO':
                return { label: 'Preparar Pincho', status: 'PREPARACION', color: 'bg-amber-500 hover:bg-amber-600' };
            case 'PREPARACION':
                return { label: 'Listo para entrega', status: 'LISTO', color: 'bg-cyan-500 hover:bg-cyan-600' };
            case 'LISTO':
                if (order.tipoEntrega === 'DOMICILIO') {
                    return { label: 'Enviar a Domicilio', status: 'RUTA', color: 'bg-indigo-500 hover:bg-indigo-600' };
                }
                return { label: 'Entregar Pedido', status: 'ENTREGADO', color: 'bg-emerald-500 hover:bg-emerald-600' };
            case 'RUTA':
                return { label: 'Marcar como Entregado', status: 'ENTREGADO', color: 'bg-emerald-500 hover:bg-emerald-600' };
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 text-left">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none italic uppercase">
                    Pedidos
                </h1>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                    Gestiona los pedidos de asados a domicilio y retiro
                </p>
            </div>

            {/* Pestañas (Tabs) */}
            <div className="flex gap-2 overflow-x-auto pb-1.5 border-b border-slate-100">
                {(['nuevos', 'preparacion', 'listos', 'historial'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === tab 
                                ? 'bg-slate-900 text-white shadow-md' 
                                : 'text-slate-400 bg-white border border-slate-100 hover:bg-slate-50'
                        }`}
                    >
                        {tab} ({orders.filter(o => TAB_STATES[tab].includes(o.estado)).length})
                    </button>
                ))}
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
                                
                                return (
                                    <div 
                                        key={order.id} 
                                        onClick={() => setSelectedOrder(order)}
                                        className={`p-6 hover:bg-slate-50/50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 ${
                                            selectedOrder?.id === order.id ? 'border-slate-800 bg-slate-50/30' : 'border-transparent'
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-slate-900">Pedido #{order.numeroPedido}</span>
                                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                                    {order.tipoEntrega}
                                                </span>
                                            </div>
                                            <p className="text-xs font-black text-slate-700">{order.nombreCliente} ({order.telefonoCliente})</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                <Clock className="size-3" /> Entrega: {order.franjaHoraria} hrs
                                            </p>
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
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedOrder.tipoEntrega}</span>
                                </div>
                                <button 
                                    onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELADO')}
                                    disabled={['ENTREGADO', 'CANCELADO'].includes(selectedOrder.estado)}
                                    className="px-3 py-1.5 border border-rose-100 text-rose-500 hover:bg-rose-50 rounded-xl text-[9px] font-black uppercase tracking-wider disabled:opacity-40"
                                >
                                    Cancelar
                                </button>
                            </div>

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
                                <div className="flex gap-2.5 items-start">
                                    <Calendar className="size-4 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Horario de Entrega</span>
                                        <span className="font-bold text-slate-800">{selectedOrder.fechaEntrega.split('T')[0]} | {selectedOrder.franjaHoraria} hrs</span>
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
                                            {/* Google Maps link */}
                                            {selectedOrder.latitud && selectedOrder.longitud && (
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedOrder.latitud},${selectedOrder.longitud}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-indigo-600 mt-2 bg-indigo-50 px-2 py-1 rounded-lg"
                                                >
                                                    <ExternalLink className="size-3" />
                                                    Ver ubicación GPS
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

                            {/* Totales */}
                            <div className="border-t border-slate-100 pt-4 space-y-1.5 text-xs font-bold text-slate-600">
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
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <ClipboardList className="size-12 text-slate-200 mx-auto mb-3" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Selecciona un Pedido</h3>
                            <p className="text-[11px] text-slate-400 font-medium">Haz click sobre cualquier pedido para ver los detalles completos y gestionarlo.</p>
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
