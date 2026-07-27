import React, { useState, useEffect } from 'react';
import { ShoppingBag, Clock, CheckCircle2, XCircle, AlertCircle, ArrowLeft, RefreshCw, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { PinchoFriendlyCodeService } from '../services/pinchoFriendlyCodeService';
import { PinchoCartItem } from '../services/pinchoCartService';
import { formatToEcuadorPhone } from '@/lib/phoneUtils';

interface OrdersHistoryProps {
    storeSlug: string;
    storeName: string;
    onReorder: (items: PinchoCartItem[]) => void;
    onBackToStore: () => void;
}

export default function PinchoClientOrdersHistory({
    storeSlug,
    storeName,
    onReorder,
    onBackToStore
}: OrdersHistoryProps) {
    const [phone, setPhone] = useState('');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const rawPhone = localStorage.getItem('pinchos_client_phone') || localStorage.getItem('user_phone') || '';
            const savedPhone = formatToEcuadorPhone(rawPhone);
            setPhone(savedPhone || rawPhone);
            if (savedPhone || rawPhone) {
                fetchOrders(savedPhone || rawPhone);
            }
        }
    }, [storeSlug]);

    const fetchOrders = async (clientPhone: string) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/public/${storeSlug}/orders?phone=${encodeURIComponent(clientPhone)}`);
            const data = await res.json();
            if (data.orders || data.pedidos) {
                setOrders(data.orders || data.pedidos);
            }
        } catch (e) {
            console.error('Error fetching order history:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleReorderClick = (order: any) => {
        if (!order.items || order.items.length === 0) return;

        const cartItems: PinchoCartItem[] = order.items.map((i: any) => ({
            product: {
                id: i.productoId || i.id,
                nombre: i.nombreProducto,
                precio: i.precioUnitario
            },
            quantity: i.cantidad
        }));

        onReorder(cartItems);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-36 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-2xs">
                <button
                    type="button"
                    onClick={onBackToStore}
                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 hover:text-slate-900 bg-slate-100 px-3 py-2 rounded-xl"
                >
                    <ArrowLeft className="size-4" />
                    <span>Volver a Tienda</span>
                </button>

                <div className="flex items-center gap-2">
                    <ShoppingBag className="size-5 text-orange-600" />
                    <span className="font-black text-sm text-slate-900">Mis Pedidos - {storeName}</span>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
                {loading ? (
                    <div className="bg-white rounded-3xl p-8 text-center text-xs font-bold text-slate-500 space-y-2">
                        <RefreshCw className="size-6 text-orange-600 animate-spin mx-auto" />
                        <p>Cargando historial de pedidos...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 space-y-3 shadow-sm">
                        <div className="size-14 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                            <ShoppingBag className="size-7" />
                        </div>
                        <h3 className="text-base font-black text-slate-900">No tienes pedidos registrados</h3>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto">
                            Tus compras realizadas aparecerán aquí con su código y estado en tiempo real.
                        </p>
                        <button
                            type="button"
                            onClick={onBackToStore}
                            className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl text-xs uppercase tracking-wider"
                        >
                            Ir al Menú de Productos
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((ord) => {
                            const friendlyCode = PinchoFriendlyCodeService.formatFriendlyCode(ord.numeroPedido, 'PIN');
                            const isDelivered = ord.estado === 'ENTREGADO';
                            const isExpired = ord.estado === 'PAGO_EXPIRADO' || ord.estado === 'CANCELADO';

                            return (
                                <div key={ord.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 text-left">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Código del Pedido</span>
                                            <span className="text-sm font-mono font-black text-orange-600">{friendlyCode}</span>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                                            isDelivered ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                            isExpired ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                            'bg-amber-100 text-amber-900 border border-amber-200'
                                        }`}>
                                            {ord.estado}
                                        </span>
                                    </div>

                                    {/* Items */}
                                    <div className="text-xs space-y-1">
                                        {ord.items && ord.items.map((it: any) => (
                                            <div key={it.id} className="flex justify-between font-medium text-slate-700">
                                                <span>{it.cantidad}x {it.nombreProducto}</span>
                                                <span className="font-mono text-slate-900">${(it.precioUnitario * it.cantidad).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                                        <div>
                                            <span className="text-[9px] font-black uppercase text-slate-400 block">Total Pagado</span>
                                            <span className="text-base font-black text-slate-900 font-mono">${ord.total.toFixed(2)}</span>
                                        </div>

                                        <div className="flex gap-2">
                                            {/* Botón Volver a Pedir */}
                                            <button
                                                type="button"
                                                onClick={() => handleReorderClick(ord)}
                                                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                                            >
                                                <RefreshCw className="size-3.5" />
                                                <span>Volver a pedir</span>
                                            </button>

                                            <Link
                                                href={`/${storeSlug}/pedidos/${ord.id}`}
                                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs uppercase rounded-xl flex items-center gap-1"
                                            >
                                                <span>Detalles</span>
                                                <ChevronRight className="size-3.5" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
