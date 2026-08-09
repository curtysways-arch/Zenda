'use client';
/**
 * @file RestaurantOrderTrackingClient.tsx
 * @module modules/restaurant/components
 * @description Página de seguimiento de pedido de restaurante Enterprise con desglose completo y layout anti-solapamiento.
 */

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, ChefHat, Bike, Package, Home, RefreshCw, Phone, MapPin, Utensils, AlertTriangle, ShieldCheck, ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
    id: string;
    productoId?: string;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: number | string;
}

interface Order {
    id: string;
    numeroPedido?: number;
    codigo?: string;
    estado: string;
    estadoDisponibilidad?: string;
    tipoEntrega?: string;
    nombreCliente?: string;
    telefonoCliente?: string;
    direccionCliente?: string;
    subtotal?: number | string;
    costoEnvio?: number | string;
    total?: number | string;
    createdAt: string;
    items: OrderItem[];
    notas?: string;
    payment?: any;
    extraInfo?: any;
}

interface Props {
    order: Order;
    negocio: any;
    storeSlug: string;
}

const STATE_CONFIG: Record<string, { label: string; icon: any; color: string; description: string }> = {
    PENDING:            { label: 'Esperando',         icon: Clock,       color: '#f59e0b', description: 'Tu pedido está en espera de confirmación del negocio.' },
    CONFIRMED:          { label: 'Aceptado',          icon: CheckCircle, color: '#10b981', description: '¡Tu pedido fue aceptado! Entrando a producción.' },
    PREPARING:          { label: 'En preparación',    icon: ChefHat,     color: '#f97316', description: 'Tu pedido está siendo preparado en la cocina.' },
    READY:              { label: '¡Pedido listo!',     icon: Package,     color: '#8b5cf6', description: 'Tu pedido está listo y empacado.' },
    ON_DELIVERY:        { label: 'En camino',          icon: Bike,        color: '#3b82f6', description: 'Tu repartidor está en camino con tu pedido.' },
    WAITING_CLIENT:     { label: '¡En el destino!',    icon: Bike,        color: '#eab308', description: '🛵 ¡El repartidor ha llegado a tu dirección! Por favor sal a recibirlo.' },
    DELIVERED:          { label: '¡Entregado!',        icon: Home,        color: '#10b981', description: '¡Tu pedido fue entregado exitosamente!' },
    CANCELLED:          { label: 'Cancelado',          icon: Clock,       color: '#ef4444', description: 'Este pedido fue cancelado.' },
};

const ORDER_STEPS = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'ON_DELIVERY', 'DELIVERED'];

function normalizeState(rawState?: string): string {
    const s = (rawState || '').toUpperCase();
    if (['PENDIENTE', 'PENDING', 'WAITING_CONFIRMATION', 'POR_CONFIRMAR', 'PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'COMPROBANTE_ENVIADO', 'COMPROBANTE_RECIBIDO'].includes(s)) return 'PENDING';
    if (['ACEPTADO', 'CONFIRMED', 'RECIBIDO'].includes(s)) return 'CONFIRMED';
    if (['EN_PREPARACION', 'PREPARACION', 'PREPARANDO', 'PREPARING'].includes(s)) return 'PREPARING';
    if (['LISTO', 'READY'].includes(s)) return 'READY';
    if (['EN_CAMINO', 'EN_RUTA', 'RUTA', 'ON_DELIVERY', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR'].includes(s)) return 'ON_DELIVERY';
    if (['ESPERANDO_CLIENTE', 'WAITING_CLIENT'].includes(s)) return 'WAITING_CLIENT';
    if (['ENTREGADO', 'DELIVERED', 'FINALIZADO', 'COMPLETADO'].includes(s)) return 'DELIVERED';
    if (['CANCELADO', 'CANCELLED', 'RECHAZADO'].includes(s)) return 'CANCELLED';
    return 'PENDING';
}

export default function RestaurantOrderTrackingClient({ order: initialOrder, negocio, storeSlug }: Props) {
    const [order, setOrder] = useState<Order>(initialOrder);
    const [refreshing, setRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const cp = negocio?.colorPrimario || '#c2410c';
    const cs = negocio?.colorSecundario || '#1c0a00';

    const normState = normalizeState(order.estado);
    const stateInfo = STATE_CONFIG[normState] || STATE_CONFIG['PENDING'];
    const StateIcon = stateInfo.icon;

    const currentStepIdx = normState === 'WAITING_CLIENT' ? 4 : ORDER_STEPS.indexOf(normState);
    const isDelivered = normState === 'DELIVERED';
    const isCancelled = normState === 'CANCELLED';

    const refreshOrder = useCallback(async () => {
        try {
            const res = await fetch(`/api/public/${storeSlug}/orders/${order.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.order) {
                    setOrder(data.order);
                }
            }
        } catch (_) {} finally {
            setRefreshing(false);
            setLastRefresh(new Date());
        }
    }, [order.id, storeSlug]);

    useEffect(() => {
        if (isDelivered || isCancelled) return;

        // 1. Refresco ultra reactivo a 2 segundos
        const interval = setInterval(refreshOrder, 2000);

        // 2. Refresco instantáneo al cambiar foco o regresar a la ventana
        const handleFocus = () => refreshOrder();
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);

        // 3. Conexión SSE en tiempo real sin recargar página
        let es: EventSource | null = null;
        try {
            es = new EventSource(`/api/public/${storeSlug}/notifications/sse`);
            const onEventTrigger = (event: any) => {
                try {
                    const data = JSON.parse(event?.data || '{}');
                    if (!data.pedidoId || data.pedidoId === order.id) {
                        refreshOrder();
                    }
                } catch (_) {
                    refreshOrder();
                }
            };
            es.onmessage = onEventTrigger;
            es.addEventListener('realtime_event', onEventTrigger);
            es.addEventListener('CAMBIOS_SOLICITADOS', onEventTrigger);
            es.addEventListener('ESTADO_CAMBIADO', onEventTrigger);
        } catch (_) {}

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
            if (es) es.close();
        };
    }, [refreshOrder, isDelivered, isCancelled, storeSlug, order.id]);

    const fmt = (v: any) => (Number(v) || 0).toFixed(2);
    
    // Cálculo seguro de Subtotal, Envío y Total Oficial
    const calculatedItemsSubtotal = (order.items || []).reduce((s, i) => s + ((Number(i.precioUnitario) || 0) * (Number(i.cantidad) || 1)), 0);
    const subtotal = Number(order.subtotal) || calculatedItemsSubtotal;
    const costoEnvio = Number(order.costoEnvio) || 0;
    const grandTotal = Number(order.total) || (subtotal + costoEnvio);

    // Cálculo del Total Propuesto de Formato Seguro si hay ítems propuestos por el local
    const parsedExtraInfo = typeof (order as any).extraInfo === 'string'
        ? JSON.parse((order as any).extraInfo || '{}')
        : ((order as any).extraInfo || {});

    const proposedItemsList = parsedExtraInfo.proposedItems || [];
    const outOfStockItemsList = parsedExtraInfo.outOfStockItemsList || [];

    const outOfStockNames = new Set(outOfStockItemsList.map((i: any) => (i.nombreProducto || i.nombre || '').trim().toLowerCase()));
    const outOfStockIds = new Set(outOfStockItemsList.flatMap((i: any) => [i.id, i.productoId]).filter(Boolean));

    const sourceProposed = proposedItemsList.length > 0 ? proposedItemsList : (order.items || []);

    const effectiveProposedItems = sourceProposed.filter((it: any) => {
        const idMatch = outOfStockIds.has(it.id) || (it.productoId && outOfStockIds.has(it.productoId));
        const nameMatch = outOfStockNames.has((it.nombreProducto || it.nombre || '').trim().toLowerCase());
        return !idMatch && !nameMatch;
    });

    const proposedItemsSubtotal = effectiveProposedItems.reduce((acc: number, it: any) => 
        acc + ((Number(it.precioUnitario || it.precio) || 0) * (Number(it.cantidad) || 1)), 0);
    
    // El total propuesto debe incluir el subtotal correcto de los ítems propuestos + costo de envío
    const proposedGrandTotal = proposedItemsSubtotal > 0 ? (proposedItemsSubtotal + costoEnvio) : (outOfStockItemsList.length > 0 ? 0 : grandTotal);

    // Estado del pago anterior
    const hasExistingPayment = !!order.payment || ['COMPROBANTE_ENVIADO', 'COMPROBANTE_RECIBIDO', 'PAGO_VERIFICADO', 'CONFIRMADO'].includes(order.payment?.estado || order.estado);

    const handlePrepareCartModification = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('modifyingOrderId', order.id);
            localStorage.setItem('modifyingOrderCode', String(order.numeroPedido || order.codigo || order.id.slice(0, 8)));
            
            const cartKey = `cart_${storeSlug}`;
            const cartItemsToLoad = effectiveProposedItems.map((it: any) => ({
                product: {
                    id: it.productoId || it.id,
                    nombre: it.nombreProducto || it.nombre,
                    precio: Number(it.precioUnitario || it.precio) || 0,
                    activo: true
                },
                quantity: Number(it.cantidad) || 1
            }));
            localStorage.setItem(cartKey, JSON.stringify(cartItemsToLoad));
        }
    };

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", background: cs, minHeight: '100vh', paddingBottom: 140 }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');`}</style>

            {/* HEADER CON PADDING SUPERIOR AMPLIADO A 130PX (PARA EVITAR SOLAPAMIENTO DE BARRA SUPERIOR E INFERIOR) */}
            <div style={{ background: `linear-gradient(135deg, ${cs}, rgba(0,0,0,0.9))`, padding: '130px 20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {negocio?.logoUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={negocio.logoUrl} alt={negocio.nombre} style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', border: `2px solid ${cp}` }} />
                            )}
                            <div>
                                <span style={{ color: '#fff', fontWeight: 900, fontSize: 16, display: 'block' }}>{negocio?.nombre || storeSlug}</span>
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700 }}>Seguimiento de Pedido en Tiempo Real</span>
                            </div>
                        </div>

                        <Link
                            href={`/${storeSlug}`}
                            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            <ArrowLeft size={14} /> Volver a Tienda
                        </Link>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 16, marginTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div>
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CÓDIGO DE ORDEN</span>
                                <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 22, margin: '2px 0 0', letterSpacing: '-0.02em' }}>
                                    Pedido #{order.numeroPedido || order.codigo || order.id.slice(0, 8).toUpperCase()}
                                </h1>
                            </div>

                            <div style={{ background: stateInfo.color, borderRadius: 999, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 14px ${stateInfo.color}40` }}>
                                <StateIcon size={16} color="#fff" />
                                <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, textTransform: 'uppercase' }}>{stateInfo.label}</span>
                            </div>
                        </div>

                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 8, margin: '8px 0 0', lineHeight: 1.4 }}>
                            {stateInfo.description}
                        </p>
                    </div>
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL CON MARGEN SUPERIOR SEGURO */}
            <div style={{ maxWidth: 800, margin: '20px auto 0', padding: '0 16px' }}>

                {/* MODAL / BANNER DE PROPUESTA DE CAMBIOS (PRODUCTOS AGOTADOS) */}
                {(order.estado === 'CAMBIOS_SOLICITADOS' || (order as any).estadoDisponibilidad === 'CAMBIOS_SOLICITADOS') && (
                    <div style={{ background: 'linear-gradient(135deg, rgba(234,88,12,0.25), rgba(245,158,11,0.25))', border: '2px solid #f97316', borderRadius: 24, padding: 20, marginBottom: 20, color: '#fff', boxShadow: '0 12px 36px rgba(234,88,12,0.25)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <span style={{ fontSize: 26 }}>🚨</span>
                            <div>
                                <h3 style={{ fontWeight: 900, fontSize: 16, color: '#fb923c', margin: 0 }}>¡Propuesta de Cambios en tu Pedido!</h3>
                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: 0 }}>Algunos productos seleccionados no se encuentran disponibles en cocina. Por favor revisa la propuesta ajustada:</p>
                            </div>
                        </div>

                        {/* DESGLOSE 1: PRODUCTOS AGOTADOS */}
                        {((order as any).extraInfo?.outOfStockItemsList || []).length > 0 && (
                            <div style={{ background: 'rgba(225,29,72,0.18)', border: '1px solid rgba(225,29,72,0.4)', borderRadius: 16, padding: 14, marginBottom: 12 }}>
                                <div style={{ color: '#f43f5e', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>🔴</span> PRODUCTOS NO DISPONIBLES (AGOTADOS):
                                </div>
                                {((order as any).extraInfo?.outOfStockItemsList || []).map((it: any, idx: number) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'line-through', padding: '3px 0' }}>
                                        <span>{it.cantidad}x {it.nombreProducto || it.nombre}</span>
                                        <span>${((Number(it.precioUnitario || it.precio) || 0) * it.cantidad).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* DESGLOSE 2: PROPUESTA DISPONIBLE Y CÁLCULO DE TOTAL CORREGIDO */}
                        <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 14, marginBottom: 14 }}>
                            <div style={{ color: '#10b981', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>🟢</span> PRODUCTOS DISPONIBLES Y PROPUESTOS:
                            </div>
                            {effectiveProposedItems.length === 0 ? (
                                <div style={{ color: '#fb923c', fontSize: 13, fontStyle: 'italic', padding: '8px 0', fontWeight: 600 }}>
                                    ⚠️ El establecimiento indica que no cuenta con los productos de este pedido en cocina. Por favor selecciona un platillo de reemplazo en el catálogo o cancela la orden.
                                </div>
                            ) : (
                                effectiveProposedItems.map((it: any, idx: number) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#fff', padding: '4px 0', fontWeight: 600 }}>
                                        <span>{it.cantidad}x {it.nombreProducto || it.nombre}</span>
                                        <span style={{ fontWeight: 800 }}>${((Number(it.precioUnitario || it.precio) || 0) * it.cantidad).toFixed(2)}</span>
                                    </div>
                                ))
                            )}

                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                                    <span>Subtotal Productos Disponibles:</span>
                                    <span>${fmt(proposedItemsSubtotal)}</span>
                                </div>
                                {costoEnvio > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                                        <span>Costo de Envío (Delivery):</span>
                                        <span>${fmt(costoEnvio)}</span>
                                    </div>
                                )}
                                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 900 }}>
                                    <span style={{ fontSize: 14, color: '#fff' }}>NUEVO TOTAL REVISADO DE LA ORDEN:</span>
                                    <span style={{ color: cp, fontSize: 22 }}>${fmt(proposedGrandTotal)}</span>
                                </div>
                            </div>
                        </div>

                        {/* AVISO DE PAGO YA REGISTRADO */}
                        {hasExistingPayment && (
                            <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 14, padding: 12, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ShieldCheck size={18} color="#10b981" />
                                <span style={{ fontSize: 12, color: '#a7f3d0', fontWeight: 700 }}>
                                    ✅ Tu comprobante de pago anterior ya está registrado. Al modificar o cancelar la orden no necesitas volver a subir otro comprobante.
                                </span>
                            </div>
                        )}

                        {/* ACCIONES DEL CLIENTE */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {effectiveProposedItems.length > 0 ? (
                                <button
                                    onClick={async () => {
                                        setRefreshing(true);
                                        try {
                                            await fetch(`/api/public/${storeSlug}/orders`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ orderId: order.id, action: 'ACEPTAR_CAMBIOS' })
                                            });
                                            refreshOrder();
                                        } catch (e) {
                                            console.error('Error al aceptar cambios:', e);
                                        } finally {
                                            setRefreshing(false);
                                        }
                                    }}
                                    disabled={refreshing}
                                    style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', borderRadius: 16, padding: '16px', fontWeight: 900, fontSize: 14, cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 6px 20px rgba(16,185,129,0.4)' }}
                                >
                                    ✓ Aceptar Propuesta de Pedido (${fmt(proposedGrandTotal)})
                                </button>
                            ) : (
                                <Link
                                    href={`/${storeSlug}?modifyingOrder=${order.id}`}
                                    onClick={handlePrepareCartModification}
                                    style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', borderRadius: 16, padding: '16px', fontWeight: 900, fontSize: 14, cursor: 'pointer', textTransform: 'uppercase', textDecoration: 'none', textAlign: 'center', display: 'block', boxShadow: '0 6px 20px rgba(16,185,129,0.4)' }}
                                >
                                    🛒 Elegir Reemplazo en el Catálogo
                                </Link>
                            )}

                            <div style={{ display: 'flex', gap: 10 }}>
                                <Link
                                    href={`/${storeSlug}?modifyingOrder=${order.id}`}
                                    onClick={handlePrepareCartModification}
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 14, padding: '12px', fontWeight: 700, fontSize: 12, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                >
                                    <span>🛒 Ver Catálogo / Reemplazar</span>
                                </Link>
                                <button
                                    onClick={async () => {
                                        if (confirm('¿Deseas cancelar el pedido definitivamente?')) {
                                            setRefreshing(true);
                                            try {
                                                await fetch(`/api/public/${storeSlug}/orders`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ orderId: order.id, action: 'CANCELAR_PEDIDO' })
                                                });
                                                refreshOrder();
                                            } catch (e) {
                                                console.error('Error al cancelar pedido:', e);
                                            } finally {
                                                setRefreshing(false);
                                            }
                                        }
                                    }}
                                    disabled={refreshing}
                                    style={{ flex: 1, background: 'rgba(225,29,72,0.18)', color: '#f43f5e', border: '1px solid rgba(225,29,72,0.4)', borderRadius: 14, padding: '12px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                                >
                                    ✕ Cancelar Pedido
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PASOS DE PROGRESO */}
                {!isCancelled && (
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: '20px 16px', marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                            {ORDER_STEPS.map((step, i) => {
                                const info = STATE_CONFIG[step];
                                const Icon = info.icon;
                                const done = currentStepIdx >= i;
                                const active = currentStepIdx === i;
                                return (
                                    <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
                                        {i > 0 && (
                                            <div style={{ position: 'absolute', top: 14, right: '50%', left: '-50%', height: 2, background: done ? cp : 'rgba(255,255,255,0.1)', zIndex: 0 }} />
                                        )}
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: done ? cp : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, boxShadow: active ? `0 0 0 4px ${cp}40` : 'none', transition: 'all 0.3s' }}>
                                            <Icon size={15} color={done ? '#fff' : 'rgba(255,255,255,0.3)'} />
                                        </div>
                                        <span style={{ color: done ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: done ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>
                                            {info.label.split(' ')[0]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* DETALLES Y TOTAL COMPLETO DE LA ORDEN */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 20, marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Utensils size={18} color={cp} />
                            <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>Detalle del Pedido</span>
                        </div>
                        <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                            {order.items?.length || 0} producto(s)
                        </span>
                    </div>

                    {order.items?.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ background: cp, color: '#fff', borderRadius: 8, padding: '3px 9px', fontSize: 12, fontWeight: 900 }}>{item.cantidad}x</span>
                                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600 }}>{item.nombreProducto}</span>
                            </div>
                            <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>${((Number(item.precioUnitario) || 0) * item.cantidad).toFixed(2)}</span>
                        </div>
                    ))}

                    {/* DESGLOSE Y GRAND TOTAL DE LA ORDEN */}
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Subtotal Productos:</span>
                            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 700 }}>${fmt(subtotal)}</span>
                        </div>
                        {costoEnvio > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Costo de Delivery / Envío:</span>
                                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 700 }}>${fmt(costoEnvio)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                            <span style={{ color: '#fff', fontWeight: 900, fontSize: 17 }}>TOTAL OFICIAL DE LA ORDEN:</span>
                            <span style={{ color: cp, fontWeight: 900, fontSize: 24, padding: '4px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: 12, border: `1px solid ${cp}40` }}>
                                ${fmt(grandTotal)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* DATOS DEL CLIENTE */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 18, marginBottom: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {order.nombreCliente && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Phone size={16} color={cp} />
                                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600 }}>{order.nombreCliente} · {order.telefonoCliente}</span>
                            </div>
                        )}
                        {order.direccionCliente && (order.tipoEntrega === 'DOMICILIO' || order.tipoEntrega === 'DELIVERY_ORDER') && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <MapPin size={16} color={cp} style={{ marginTop: 2 }} />
                                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{order.direccionCliente}</span>
                            </div>
                        )}
                        {order.notas && (
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontStyle: 'italic', paddingTop: 6 }}>
                                Nota del cliente: {order.notas}
                            </div>
                        )}
                    </div>
                </div>

                {/* ACCIONES */}
                <div style={{ display: 'flex', gap: 12 }}>
                    {!isDelivered && !isCancelled && (
                        <button
                            onClick={refreshOrder}
                            disabled={refreshing}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 14, padding: '16px', color: '#fff', fontWeight: 700, fontSize: 14, cursor: refreshing ? 'default' : 'pointer', opacity: refreshing ? 0.6 : 1 }}
                        >
                            <RefreshCw size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                            {refreshing ? 'Actualizando...' : 'Actualizar Estado'}
                        </button>
                    )}
                    <Link
                        href={`/${storeSlug}`}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: cp, borderRadius: 14, padding: '16px', color: '#fff', fontWeight: 900, fontSize: 14, textDecoration: 'none', boxShadow: `0 4px 14px ${cp}40` }}
                    >
                        <ShoppingBag size={18} />
                        Hacer Otro Pedido
                    </Link>
                </div>

                {!isDelivered && !isCancelled && (
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center', marginTop: 14 }}>
                        Actualización automática constante · Última: {lastRefresh.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                )}

                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}
