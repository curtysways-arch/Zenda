import prisma from '@/lib/prisma';
import { 
    ShoppingBag, DollarSign, Users, Package, TrendingUp, Clock, 
    ChevronRight, ArrowUpRight, AlertCircle, MapPin, CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { startOfMonth } from 'date-fns';

interface Props {
    negocioId: string;
    role: string;
}

export default async function ProductsDashboard({ negocioId, role }: Props) {
    const now = new Date();
    const startToday = new Date(new Date().setUTCHours(0, 0, 0, 0));
    const endToday = new Date(new Date().setUTCHours(23, 59, 59, 999));
    const startMonth = startOfMonth(now);

    // Queries en paralelo
    const [
        pedidosHoyCount,
        pedidosMesCount,
        ventasHoyData,
        ventasMesData,
        clientesCount,
        pedidosActivos,
        recientesItems,
        negocio
    ] = await Promise.all([
        (prisma as any).pedido.count({
            where: {
                negocioId,
                createdAt: { gte: startToday, lte: endToday },
                estado: { not: 'CANCELADO' }
            }
        }),
        (prisma as any).pedido.count({
            where: {
                negocioId,
                createdAt: { gte: startMonth },
                estado: { not: 'CANCELADO' }
            }
        }),
        (prisma as any).pedido.aggregate({
            where: {
                negocioId,
                createdAt: { gte: startToday, lte: endToday },
                estado: { not: 'CANCELADO' }
            },
            _sum: { total: true }
        }),
        (prisma as any).pedido.aggregate({
            where: {
                negocioId,
                createdAt: { gte: startMonth },
                estado: { not: 'CANCELADO' }
            },
            _sum: { total: true }
        }),
        prisma.cliente.count({
            where: { negocioId }
        }),
        (prisma as any).pedido.findMany({
            where: {
                negocioId,
                estado: { in: ['RECIBIDO', 'PREPARACION', 'LISTO', 'RUTA'] }
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                items: true
            }
        }),
        (prisma as any).pedidoItem.findMany({
            where: {
                pedido: {
                    negocioId,
                    estado: 'ENTREGADO',
                    createdAt: { gte: startMonth }
                }
            },
            select: {
                nombreProducto: true,
                cantidad: true,
                precioUnitario: true
            }
        }),
        prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { nombre: true, colorPrimario: true, slug: true }
        })
    ]);

    const ventasHoy = ventasHoyData._sum?.total || 0;
    const ventasMes = ventasMesData._sum?.total || 0;
    const primaryColor = negocio?.colorPrimario || '#1dc95c';

    // Agrupar productos más vendidos en memoria
    const productSalesMap = new Map<string, { cantidad: number; total: number }>();
    recientesItems.forEach((item: any) => {
        const existing = productSalesMap.get(item.nombreProducto) || { cantidad: 0, total: 0 };
        productSalesMap.set(item.nombreProducto, {
            cantidad: existing.cantidad + item.cantidad,
            total: existing.total + (item.precioUnitario * item.cantidad)
        });
    });

    const topProducts = Array.from(productSalesMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

    // Estados amigables de pedidos
    const STATUS_COLORS: Record<string, string> = {
        RECIBIDO: 'bg-emerald-500/10 text-emerald-600',
        PREPARACION: 'bg-amber-500/10 text-amber-600',
        LISTO: 'bg-cyan-500/10 text-cyan-600',
        RUTA: 'bg-indigo-500/10 text-indigo-600',
        ENTREGADO: 'bg-slate-500/10 text-slate-600',
        CANCELADO: 'bg-rose-500/10 text-rose-600'
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none italic uppercase">
                        Dashboard
                    </h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                        Estadísticas y gestión operativa de {negocio?.nombre}
                    </p>
                </div>
                <Link 
                    href={`/${negocio?.slug}`}
                    target="_blank"
                    className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                >
                    Ver Tienda Online
                    <ArrowUpRight className="size-4" />
                </Link>
            </div>

            {/* Tarjetas de Estadísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Ingresos Hoy */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="size-12 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-500 shrink-0">
                        <DollarSign className="size-6" />
                    </div>
                    <div className="text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Ventas Hoy</span>
                        <span className="text-2xl font-black text-slate-900 leading-tight">${ventasHoy.toFixed(2)}</span>
                    </div>
                </div>

                {/* Ingresos Mes */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="size-12 rounded-2xl flex items-center justify-center bg-cyan-50 text-cyan-500 shrink-0">
                        <TrendingUp className="size-6" />
                    </div>
                    <div className="text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Ventas Mes</span>
                        <span className="text-2xl font-black text-slate-900 leading-tight">${ventasMes.toFixed(2)}</span>
                    </div>
                </div>

                {/* Pedidos Hoy */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="size-12 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-500 shrink-0">
                        <ShoppingBag className="size-6" />
                    </div>
                    <div className="text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pedidos Hoy</span>
                        <span className="text-2xl font-black text-slate-900 leading-tight">{pedidosHoyCount}</span>
                    </div>
                </div>

                {/* Clientes */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="size-12 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-500 shrink-0">
                        <Users className="size-6" />
                    </div>
                    <div className="text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Clientes</span>
                        <span className="text-2xl font-black text-slate-900 leading-tight">{clientesCount}</span>
                    </div>
                </div>
            </div>

            {/* Contenedores Principales */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Listado de Pedidos Activos */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="size-4 text-slate-500" />
                                Pedidos Activos
                            </h3>
                            <Link 
                                href="/admin/pedidos"
                                className="text-[9px] font-black uppercase tracking-widest flex items-center"
                                style={{ color: primaryColor }}
                            >
                                Ver todos
                                <ChevronRight className="size-4" />
                            </Link>
                        </div>

                        {pedidosActivos.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {pedidosActivos.map((order: any) => (
                                    <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-xs font-black text-slate-800">Pedido #{order.numeroPedido}</span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    STATUS_COLORS[order.estado] || 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {order.estado}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                                {order.nombreCliente} • {order.tipoEntrega} • {order.franjaHoraria} hrs
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-4">
                                            <span className="text-sm font-black text-slate-800">${order.total.toFixed(2)}</span>
                                            <Link
                                                href={`/admin/pedidos?id=${order.id}`}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[9px] font-black uppercase tracking-wider rounded-xl text-slate-600 active:scale-95 transition-transform"
                                            >
                                                Gestionar
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <CheckCircle className="size-12 text-slate-200 mx-auto mb-3" />
                                <h4 className="text-xs font-black text-slate-700 mb-1">¡Al día!</h4>
                                <p className="text-[11px] text-slate-400 font-medium">No tienes pedidos activos pendientes.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Productos más vendidos */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                            <Package className="size-4 text-slate-500" />
                            Más Vendidos (Mes)
                        </h3>

                        {topProducts.length > 0 ? (
                            <div className="space-y-4">
                                {topProducts.map((p, idx) => (
                                    <div key={p.name} className="flex items-center justify-between gap-3 text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-slate-800 leading-tight">{p.name}</h4>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {p.cantidad} unidades vendidas
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-black text-slate-800">${p.total.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <AlertCircle className="size-12 text-slate-200 mx-auto mb-3" />
                                <h4 className="text-xs font-black text-slate-700 mb-1">Sin datos</h4>
                                <p className="text-[11px] text-slate-400 font-medium">Completa pedidos para ver estadísticas.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
