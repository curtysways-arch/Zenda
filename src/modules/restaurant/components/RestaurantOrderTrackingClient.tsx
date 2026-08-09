'use client';
/**
 * @file RestaurantOrderTrackingClient.tsx
 * @module modules/restaurant/components
 * @description Página de seguimiento de pedido de restaurante Enterprise.
 * Muestra estado del pedido, desglose de items, costos y permite refrescar el estado.
 */

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, ChefHat, Bike, Package, Home, RefreshCw, Phone, MapPin, Utensils } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
    id: string;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: number | string;
}

interface Order {
    id: string;
    numeroPedido?: number;
    estado: string;
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
        setRefreshing(true);
        try {
            const res = await fetch(`/api/public/${storeSlug}/orders/${order.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.order) setOrder(data.order);
            }
        } catch (_) {} finally {
            setRefreshing(false);
            setLastRefresh(new Date());
        }
    }, [order.id, storeSlug]);

    // Auto-refresh cada 5s para que los cambios de estado en cocina/repartidor se reflejen de inmediato
    useEffect(() => {
        if (isDelivered || isCancelled) return;
        const interval = setInterval(refreshOrder, 5000);
        return () => clearInterval(interval);
    }, [refreshOrder, isDelivered, isCancelled]);

    const fmt = (v: any) => (Number(v) || 0).toFixed(2);
    const subtotal = Number(order.subtotal) || order.items.reduce((s, i) => s + (Number(i.precioUnitario) || 0) * i.cantidad, 0);
    const costoEnvio = Number(order.costoEnvio) || 0;
    const total = Number(order.total) || subtotal + costoEnvio;

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", background: cs, minHeight: '100vh', paddingBottom: 40 }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');`}</style>

            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${cs}, rgba(0,0,0,0.8))`, padding: '20px 20px 28px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    {negocio?.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={negocio.logoUrl} alt={negocio.nombre} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', border: `2px solid ${cp}` }} />
                    )}
                    <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>{negocio?.nombre || storeSlug}</span>
                </div>

                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 4 }}>
                    Pedido #{order.numeroPedido || order.id.slice(0, 8).toUpperCase()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ background: stateInfo.color, borderRadius: 999, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <StateIcon size={14} color="#fff" />
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{stateInfo.label}</span>
                    </div>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 8 }}>{stateInfo.description}</p>
            </div>

            <div style={{ padding: '0 16px', marginTop: -8 }}>

                {/* MODAL / BANNER DE PROPUESTA DE CAMBIOS SI PRODUCTOS AGOTADOS */}
                {(order.estado === 'CAMBIOS_SOLICITADOS' || (order as any).estadoDisponibilidad === 'CAMBIOS_SOLICITADOS') && (
                    <div style={{ background: 'linear-gradient(135deg, rgba(234,88,12,0.15), rgba(245,158,11,0.2))', border: '2px solid #ea580c', borderRadius: 16, padding: 16, marginBottom: 16, color: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 18 }}>⚠️</span>
                            <span style={{ fontWeight: 900, fontSize: 14, color: '#f97316' }}>Propuesta de Modificación de Pedido</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 12, lineHeight: 1.4 }}>
                            El establecimiento ha verificado los productos y nos notifica que algunos ítems están agotados. Han preparado la siguiente versión modificada de tu pedido:
                        </p>

                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 12 }}>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>Nuevos Productos Disponibles</div>
                            {((order as any).extraInfo?.proposedItems || []).map((it: any, idx: number) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                    <span>{it.cantidad}x {it.nombreProducto || it.nombre}</span>
                                    <span style={{ fontWeight: 700 }}>${((Number(it.precioUnitario || it.precio) || 0) * it.cantidad).toFixed(2)}</span>
                                </div>
                            ))}
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
                                <span>Nuevo Total:</span>
                                <span style={{ color: cp, fontSize: 15 }}>${Number((order as any).extraInfo?.proposedTotal ?? order.total).toFixed(2)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
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
                                style={{ flex: 1, background: '#10b981', color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontWeight: 900, fontSize: 12, cursor: 'pointer' }}
                            >
                                ✓ Aceptar Cambios
                            </button>
                            <button
                                onClick={async () => {
                                    if (confirm('¿Deseas cancelar el pedido?')) {
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
                                style={{ flex: 1, background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 12, padding: '12px', fontWeight: 900, fontSize: 12, cursor: 'pointer' }}
                            >
                                ✕ Cancelar Pedido
                            </button>
                        </div>
                    </div>
                )}

                {/* Progress Steps */}
                {!isCancelled && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '16px 12px', marginBottom: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                            {ORDER_STEPS.map((step, i) => {
                                const info = STATE_CONFIG[step];
                                const Icon = info.icon;
                                const done = currentStepIdx >= i;
                                const active = currentStepIdx === i;
                                return (
                                    <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
                                        {i > 0 && (
                                            <div style={{ position: 'absolute', top: 14, right: '50%', left: '-50%', height: 2, background: done ? cp : 'rgba(255,255,255,0.1)', zIndex: 0 }} />
                                        )}
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? cp : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, boxShadow: active ? `0 0 0 3px ${cp}40` : 'none', transition: 'all 0.3s' }}>
                                            <Icon size={13} color={done ? '#fff' : 'rgba(255,255,255,0.3)'} />
                                        </div>
                                        <span style={{ color: done ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: done ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>
                                            {info.label.split(' ')[0]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Items */}
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Utensils size={16} color={cp} />
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Tu pedido</span>
                    </div>
                    {order.items.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ background: cp, color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{item.cantidad}x</span>
                                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{item.nombreProducto}</span>
                            </div>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>${((Number(item.precioUnitario) || 0) * item.cantidad).toFixed(2)}</span>
                        </div>
                    ))}

                    {/* Totales */}
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Subtotal</span>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>${fmt(subtotal)}</span>
                        </div>
                        {costoEnvio > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Delivery</span>
                                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>${fmt(costoEnvio)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                            <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>Total</span>
                            <span style={{ color: cp, fontWeight: 900, fontSize: 20 }}>${fmt(total)}</span>
                        </div>
                    </div>
                </div>

                {/* Info cliente */}
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {order.nombreCliente && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Phone size={14} color={cp} />
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{order.nombreCliente} · {order.telefonoCliente}</span>
                            </div>
                        )}
                        {order.direccionCliente && order.tipoEntrega === 'DOMICILIO' && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <MapPin size={14} color={cp} style={{ marginTop: 2 }} />
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{order.direccionCliente}</span>
                            </div>
                        )}
                        {order.notas && (
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontStyle: 'italic', paddingTop: 4 }}>
                                Nota: {order.notas}
                            </div>
                        )}
                    </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 10 }}>
                    {!isDelivered && !isCancelled && (
                        <button
                            onClick={refreshOrder}
                            disabled={refreshing}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '14px', color: '#fff', fontWeight: 600, fontSize: 14, cursor: refreshing ? 'default' : 'pointer', opacity: refreshing ? 0.6 : 1 }}
                        >
                            <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                            {refreshing ? 'Actualizando...' : 'Actualizar estado'}
                        </button>
                    )}
                    <Link
                        href={`/${storeSlug}`}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: cp, borderRadius: 12, padding: '14px', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
                    >
                        Hacer otro pedido
                    </Link>
                </div>

                {!isDelivered && !isCancelled && (
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
                        Actualización automática cada 15 segundos · Última: {lastRefresh.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                )}

                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}
