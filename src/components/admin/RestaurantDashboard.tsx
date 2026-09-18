import prisma from '@/lib/prisma';
import { 
    Utensils, DollarSign, Users, TrendingUp, Clock, 
    ChevronRight, ArrowUpRight, AlertCircle, MapPin, 
    CheckCircle2, Bell, ChefHat, QrCode, Store, Sparkles, Layout
} from 'lucide-react';
import Link from 'next/link';
import { startOfMonth } from 'date-fns';
import PlanStatusCard from '@/components/ui/PlanStatusCard';
import { featureService } from '@/lib/services/featureService';
import { EntitlementsService } from '@/core/entitlements/EntitlementsService';

interface Props {
    negocioId: string;
    role: string;
}

export default async function RestaurantDashboard({ negocioId, role }: Props) {
    const now = new Date();
    const startToday = new Date(new Date().setUTCHours(0, 0, 0, 0));
    const endToday = new Date(new Date().setUTCHours(23, 59, 59, 999));
    const startMonth = startOfMonth(now);

    // Consultas paralelas para el restaurante
    const [
        ventasHoyData,
        ventasMesData,
        pedidosHoyCount,
        pedidosMesCount,
        mesas,
        pedidosActivos,
        clientesCount,
        negocio,
        entitlements
    ] = await Promise.all([
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
        (prisma as any).restaurantTable.findMany({
            where: { negocioId },
            include: {
                _count: {
                    select: {
                        orderRequests: { where: { estado: 'PENDING_ADMIN_CONFIRMATION' } },
                        waiterCalls: { where: { estado: { in: ['PENDING', 'ACKNOWLEDGED'] } } }
                    }
                },
                waiterCalls: {
                    where: { estado: { in: ['PENDING', 'ACKNOWLEDGED'] } },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: [{ numero: 'asc' }, { createdAt: 'asc' }]
        }).catch(() => []),
        (prisma as any).pedido.findMany({
            where: {
                negocioId,
                estado: { in: ['RECIBIDO', 'PREPARACION', 'LISTO'] }
            },
            include: {
                items: true
            },
            orderBy: { createdAt: 'desc' },
            take: 8
        }).catch(() => []),
        prisma.cliente.count({
            where: { negocioId }
        }).catch(() => 0),
        prisma.negocio.findUnique({
            where: { id: negocioId },
            include: { Suscripcion: { include: { Plan: true } } }
        }),
        EntitlementsService.resolve(negocioId).catch(() => null)
    ]);

    const ventasHoy = ventasHoyData._sum?.total || 0;
    const ventasMes = ventasMesData._sum?.total || 0;
    const primaryColor = negocio?.colorPrimario || '#f59e0b'; // Amber cálido para restaurantes

    // Enriquecer mesas con sus pedidos
    const enrichedMesas = mesas.map((m: any) => {
        const activeOrder = pedidosActivos.find((ord: any) => {
            const extra = ord.extraInfo || {};
            if (extra.tableId && extra.tableId === m.id) return true;
            if (extra.tableName && extra.tableName.trim().toLowerCase() === m.nombre.trim().toLowerCase()) return true;
            if (ord.referenciaCliente && ord.referenciaCliente.toLowerCase().includes(m.nombre.toLowerCase())) return true;
            return false;
        });

        const lastCall = m.waiterCalls?.[0];
        const hasBillRequest = lastCall && (
            lastCall.notas?.toLowerCase().includes('cuenta') ||
            lastCall.notas?.toLowerCase().includes('pagar') ||
            lastCall.notas?.toLowerCase().includes('cobro')
        );

        let status = 'DISPONIBLE';
        if (hasBillRequest) {
            status = 'CUENTA_SOLICITADA';
        } else if (activeOrder) {
            status = 'OCUPADA';
        } else if (!m.activa) {
            status = 'INACTIVA';
        }

        return {
            ...m,
            status,
            activeOrder
        };
    });

    const mesasOcupadas = enrichedMesas.filter((m: any) => m.status === 'OCUPADA' || m.status === 'CUENTA_SOLICITADA').length;
    const mesasDisponibles = enrichedMesas.filter((m: any) => m.status === 'DISPONIBLE').length;
    const llamadasPendientes = enrichedMesas.reduce((acc: number, m: any) => acc + (m._count?.waiterCalls || 0), 0);

    const sub = negocio?.Suscripcion;
    const isTrial = (entitlements?.status === 'trial') || (sub?.estado === 'trial');
    const planName = entitlements?.planName || sub?.Plan?.name || 'RESTAURANTE';
    const planEstado = entitlements?.status || sub?.estado || 'active';
    const daysLeft = sub?.fechaFin ? Math.ceil((new Date(sub.fechaFin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Header del Restaurante */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] block italic text-amber-600">
                        MONITOR GASTRONÓMICO
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none uppercase italic">
                        {negocio?.nombre || 'Mi Restaurante'}
                    </h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        Salón de Mesas y Cocina en Tiempo Real
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <Link 
                        href="/admin/cocina"
                        className="inline-flex items-center gap-2 bg-slate-900 text-white hover:bg-black px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm"
                    >
                        <ChefHat size={14} className="text-amber-400" />
                        Pantalla de Cocina
                    </Link>
                    <Link 
                        href="/admin/mesas"
                        className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm"
                    >
                        <Layout size={14} className="text-indigo-500" />
                        Ver Salón de Mesas
                    </Link>
                    {negocio?.slug && (
                        <Link 
                            href={`/${negocio.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200/60 text-amber-800 hover:bg-amber-100 px-3.5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                        >
                            Menú QR
                            <ArrowUpRight size={13} />
                        </Link>
                    )}
                </div>
            </div>

            {/* Alerta de Mesero / Cuenta si existe */}
            {llamadasPendientes > 0 && (
                <div className="p-4 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-between gap-4 shadow-md animate-bounce duration-1000">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-950 text-amber-400 rounded-xl">
                            <Bell size={18} />
                        </div>
                        <div>
                            <p className="font-black text-xs uppercase tracking-tight">
                                {llamadasPendientes === 1 ? '1 Solicitud en Salón' : `${llamadasPendientes} Solicitudes en Salón`}
                            </p>
                            <p className="text-[10px] font-bold opacity-80">Hay mesas solicitando atención o la cuenta.</p>
                        </div>
                    </div>
                    <Link 
                        href="/admin/mesas"
                        className="px-4 py-2 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition"
                    >
                        Atender Ahora
                    </Link>
                </div>
            )}

            {/* Tarjetas de Estadísticas Operativas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Ventas Hoy */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-xs flex items-center gap-5">
                    <div className="size-12 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                        <DollarSign className="size-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Ventas Hoy</span>
                        <span className="text-2xl font-black text-slate-900 leading-tight">${ventasHoy.toFixed(2)}</span>
                        <span className="text-[9px] font-bold text-slate-400 block mt-0.5">Recaudación del día</span>
                    </div>
                </div>

                {/* Mesas Activas */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-xs flex items-center gap-5">
                    <div className="size-12 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
                        <Utensils className="size-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Ocupación Salón</span>
                        <span className="text-2xl font-black text-slate-900 leading-tight">
                            {mesasOcupadas} <span className="text-sm font-bold text-slate-400">/ {enrichedMesas.length || 0}</span>
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 block mt-0.5">{mesasDisponibles} mesas libres</span>
                    </div>
                </div>

                {/* Comandas en Curso */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-xs flex items-center gap-5">
                    <div className="size-12 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                        <ChefHat className="size-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">En Cocina</span>
                        <span className="text-2xl font-black text-slate-900 leading-tight">{pedidosActivos.length}</span>
                        <span className="text-[9px] font-bold text-slate-400 block mt-0.5">Comandas activas</span>
                    </div>
                </div>

                {/* Pedidos Atendidos Hoy */}
                <div className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-xs flex items-center gap-5">
                    <div className="size-12 rounded-2xl flex items-center justify-center bg-cyan-50 text-cyan-600 border border-cyan-100 shrink-0">
                        <TrendingUp className="size-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pedidos Hoy</span>
                        <span className="text-2xl font-black text-slate-900 leading-tight">{pedidosHoyCount}</span>
                        <span className="text-[9px] font-bold text-slate-400 block mt-0.5">Órdenes totales</span>
                    </div>
                </div>
            </div>

            {/* Layout Principal: Salón en Vivo + Sidebar de Comandas & Plan */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Izquierda (2 cols): Estado de Mesas en Vivo */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                                    <Layout size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                                        Salón de Mesas en Vivo
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                        Supervisa mesas ocupadas, pedidos en curso y clientes solicitando cuenta.
                                    </p>
                                </div>
                            </div>
                            <Link 
                                href="/admin/mesas"
                                className="text-[10px] font-black uppercase tracking-wider text-amber-600 hover:text-amber-700 flex items-center gap-1"
                            >
                                Administrar Salón <ChevronRight size={14} />
                            </Link>
                        </div>

                        {enrichedMesas.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl space-y-3">
                                <div className="size-12 rounded-full bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
                                    <Utensils size={20} />
                                </div>
                                <h4 className="font-bold text-slate-700 text-sm">Aún no tienes mesas configuradas</h4>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                    Crea tus primeras mesas para generar códigos QR y permitir pedidos desde el salón.
                                </p>
                                <Link
                                    href="/admin/mesas"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition shadow-xs"
                                >
                                    Configurar Mesas
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                                {enrichedMesas.map((mesa: any) => {
                                    const isOcupada = mesa.status === 'OCUPADA';
                                    const isCuenta = mesa.status === 'CUENTA_SOLICITADA';

                                    return (
                                        <Link 
                                            key={mesa.id}
                                            href="/admin/mesas"
                                            className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between min-h-[120px] ${
                                                isCuenta 
                                                    ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20 shadow-xs' 
                                                    : isOcupada 
                                                    ? 'bg-indigo-50/50 border-indigo-200 shadow-xs' 
                                                    : 'bg-slate-50/70 border-slate-200/70 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <span className="text-xs font-black text-slate-800 uppercase block">
                                                        {mesa.nombre}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase">
                                                        {mesa.capacidad ? `${mesa.capacidad} Personas` : 'Mesa'}
                                                    </span>
                                                </div>
                                                <span className={`size-2 rounded-full ${
                                                    isCuenta ? 'bg-amber-500 animate-ping' : isOcupada ? 'bg-indigo-600' : 'bg-emerald-500'
                                                }`} />
                                            </div>

                                            <div className="pt-3 border-t border-slate-200/50 flex items-end justify-between">
                                                {isCuenta ? (
                                                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-tight flex items-center gap-1">
                                                        <DollarSign size={10} /> Pide Cuenta
                                                    </span>
                                                ) : isOcupada ? (
                                                    <div>
                                                        <span className="text-[8px] font-black text-indigo-600 uppercase block">Consumo:</span>
                                                        <span className="text-xs font-black text-slate-900">
                                                            ${(mesa.activeOrder?.total || 0).toFixed(2)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight">
                                                        Disponible
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Comandas Recientes en Cocina */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <ChefHat size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                                        Comandas Activas en Cocina
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                        Platos y bebidas que se están preparando en este momento.
                                    </p>
                                </div>
                            </div>
                            <Link 
                                href="/admin/cocina"
                                className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                                Pantalla Completa <ChevronRight size={14} />
                            </Link>
                        </div>

                        {pedidosActivos.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs font-medium">
                                No hay comandas en preparación en este momento. Cocina al día.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pedidosActivos.slice(0, 4).map((p: any) => (
                                    <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-slate-800 uppercase">
                                                    #{p.numeroPedido || p.id.slice(-4)}
                                                </span>
                                                {p.referenciaCliente && (
                                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                                                        {p.referenciaCliente}
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                                    p.estado === 'RECIBIDO' ? 'bg-emerald-100 text-emerald-700' :
                                                    p.estado === 'PREPARACION' ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700'
                                                }`}>
                                                    {p.estado}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-1">
                                                {p.items?.map((it: any) => `${it.cantidad}x ${it.nombreProducto}`).join(', ') || 'Sin productos'}
                                            </p>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="text-xs font-black text-slate-900 block">${(p.total || 0).toFixed(2)}</span>
                                            <Link 
                                                href="/admin/cocina" 
                                                className="text-[9px] font-bold text-indigo-600 hover:underline"
                                            >
                                                Ver Comanda
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Columna Derecha: Plan del Restaurante y Accesos */}
                <div className="space-y-6">
                    <PlanStatusCard 
                        planName={planName}
                        estado={planEstado}
                        daysLeft={daysLeft}
                        limits={entitlements?.limits}
                        usage={{
                            ordersMonthly: pedidosMesCount,
                            orders: pedidosMesCount,
                            staff: entitlements?.usage?.professionals ?? 0,
                            tables: mesas.length
                        }}
                        capabilities={entitlements?.capabilities}
                        tipoNegocio="RESTAURANTE"
                    />

                    {/* Accesos Rápidos para Restaurantes */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-7 text-white shadow-xl space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 block">
                            OPERACIONES RÁPIDAS
                        </span>
                        
                        <div className="grid grid-cols-1 gap-2.5">
                            <Link 
                                href="/admin/caja"
                                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition"
                            >
                                <div className="flex items-center gap-3">
                                    <DollarSign size={16} className="text-emerald-400" />
                                    <span>Caja & Facturación</span>
                                </div>
                                <ChevronRight size={14} className="text-slate-400" />
                            </Link>

                            <Link 
                                href="/admin/mesas"
                                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition"
                            >
                                <div className="flex items-center gap-3">
                                    <QrCode size={16} className="text-amber-400" />
                                    <span>Descargar QR de Mesas</span>
                                </div>
                                <ChevronRight size={14} className="text-slate-400" />
                            </Link>

                            <Link 
                                href="/admin/productos"
                                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition"
                            >
                                <div className="flex items-center gap-3">
                                    <Utensils size={16} className="text-cyan-400" />
                                    <span>Platos, Bebidas y Carta</span>
                                </div>
                                <ChevronRight size={14} className="text-slate-400" />
                            </Link>

                            <Link 
                                href="/admin/inventario"
                                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition"
                            >
                                <div className="flex items-center gap-3">
                                    <Store size={16} className="text-purple-400" />
                                    <span>Control de Inventario</span>
                                </div>
                                <ChevronRight size={14} className="text-slate-400" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
