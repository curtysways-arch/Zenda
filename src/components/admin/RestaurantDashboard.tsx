import prisma from '@/lib/prisma';
import {
    Utensils, DollarSign, TrendingUp, TrendingDown, ChevronRight, ArrowUpRight,
    Bell, ChefHat, QrCode, Store, Layout, Truck, ShoppingBag, Receipt, Package, Inbox, Users,
} from 'lucide-react';
import Link from 'next/link';
import { startOfMonth } from 'date-fns';
import PlanStatusCard from '@/components/ui/PlanStatusCard';
import { EntitlementsService } from '@/core/entitlements/EntitlementsService';

interface Props {
    negocioId: string;
    role: string;
}

// Estados que ya no requieren trabajo del restaurante
const CLOSED_STATES = ['ENTREGADO', 'FINALIZADO', 'CANCELADO'];

const STATE_LABEL: Record<string, { label: string; cls: string }> = {
    RECIBIDO: { label: 'Nuevo', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
    PRODUCTOS_CONFIRMADOS: { label: 'Confirmado', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
    CAMBIOS_SOLICITADOS: { label: 'Cambios pedidos', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
    CAMBIOS_ACEPTADOS: { label: 'Cambios aceptados', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
    PAGO_ADICIONAL_PENDIENTE: { label: 'Pago pendiente', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
    ACEPTADO: { label: 'Aceptado', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
    EN_PREPARACION: { label: 'En cocina', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
    PREPARACION: { label: 'En cocina', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
    LISTO: { label: 'Listo', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    FULFILLMENT: { label: 'Despachando', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
    ASIGNADO: { label: 'Repartidor asignado', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
    EN_CAMINO: { label: 'En camino', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
};

const money = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;
const num = (n: any) => Number(n) || 0;

function channelOf(p: any): 'MESA' | 'DOMICILIO' | 'RETIRO' {
    const extra = (p.extraInfo || {}) as any;
    if (extra.tableId || extra.tableName || String(p.tipoEntrega).toUpperCase() === 'MESA') return 'MESA';
    return String(p.tipoEntrega).toUpperCase() === 'DOMICILIO' ? 'DOMICILIO' : 'RETIRO';
}

function minutesAgo(d: Date | string) {
    const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
    if (m < 1) return 'ahora';
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    return `hace ${h} h ${m % 60 ? `${m % 60} min` : ''}`.trim();
}

export default async function RestaurantDashboard({ negocioId }: Props) {
    const now = new Date();
    // "Hoy" y "ayer" según la hora de Ecuador (UTC-5)
    const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    const todayKey = dayKey(now);
    const startToday = new Date(`${todayKey}T00:00:00-05:00`);
    const endToday = new Date(`${todayKey}T23:59:59.999-05:00`);
    const startYesterday = new Date(startToday.getTime() - 24 * 3600 * 1000);
    // Ayer hasta la misma hora, para comparar justo
    const yesterdaySameTime = new Date(now.getTime() - 24 * 3600 * 1000);
    const startMonth = startOfMonth(now);

    const [
        pedidosHoy,
        ventasAyerData,
        pedidosMesCount,
        mesas,
        pedidosActivos,
        topItems,
        negocio,
        entitlements,
    ] = await Promise.all([
        (prisma as any).pedido.findMany({
            where: { negocioId, createdAt: { gte: startToday, lte: endToday }, estado: { not: 'CANCELADO' } },
            select: { id: true, total: true, tipoEntrega: true, extraInfo: true },
        }).catch(() => []),
        (prisma as any).pedido.aggregate({
            where: { negocioId, createdAt: { gte: startYesterday, lte: yesterdaySameTime }, estado: { not: 'CANCELADO' } },
            _sum: { total: true },
            _count: true,
        }).catch(() => ({ _sum: { total: 0 }, _count: 0 })),
        (prisma as any).pedido.count({
            where: { negocioId, createdAt: { gte: startMonth }, estado: { not: 'CANCELADO' } },
        }).catch(() => 0),
        (prisma as any).restaurantTable.findMany({
            where: { negocioId },
            include: {
                _count: {
                    select: {
                        orderRequests: { where: { estado: 'PENDING_ADMIN_CONFIRMATION' } },
                        waiterCalls: { where: { estado: { in: ['PENDING', 'ACKNOWLEDGED'] } } },
                    },
                },
                waiterCalls: {
                    where: { estado: { in: ['PENDING', 'ACKNOWLEDGED'] } },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
            orderBy: [{ numero: 'asc' }, { createdAt: 'asc' }],
        }).catch(() => []),
        (prisma as any).pedido.findMany({
            where: { negocioId, estado: { notIn: CLOSED_STATES }, createdAt: { gte: new Date(now.getTime() - 2 * 24 * 3600 * 1000) } },
            include: { items: true },
            orderBy: { createdAt: 'asc' },
            take: 30,
        }).catch(() => []),
        (prisma as any).pedidoItem.groupBy({
            by: ['nombreProducto'],
            where: { pedido: { negocioId, createdAt: { gte: startToday, lte: endToday }, estado: { not: 'CANCELADO' } } },
            _sum: { cantidad: true },
            orderBy: { _sum: { cantidad: 'desc' } },
            take: 5,
        }).catch(() => []),
        prisma.negocio.findUnique({
            where: { id: negocioId },
            include: { Suscripcion: { include: { Plan: true } } },
        }),
        EntitlementsService.resolve(negocioId).catch(() => null),
    ]);

    const brand = negocio?.colorPrimario || '#e11d48';

    // ── Ventas y canales de hoy ──
    const ventasHoy = pedidosHoy.reduce((s: number, p: any) => s + num(p.total), 0);
    const pedidosHoyCount = pedidosHoy.length;
    const ticketPromedio = pedidosHoyCount ? ventasHoy / pedidosHoyCount : 0;
    const ventasAyer = num(ventasAyerData?._sum?.total);
    const deltaPct = ventasAyer > 0 ? Math.round(((ventasHoy - ventasAyer) / ventasAyer) * 100) : null;

    const channels = { MESA: { n: 0, total: 0 }, DOMICILIO: { n: 0, total: 0 }, RETIRO: { n: 0, total: 0 } };
    for (const p of pedidosHoy) {
        const c = channels[channelOf(p)];
        c.n += 1;
        c.total += num(p.total);
    }

    // ── Mesas en vivo ──
    const enrichedMesas = mesas.map((m: any) => {
        const activeOrder = pedidosActivos.find((ord: any) => {
            const extra = ord.extraInfo || {};
            if (extra.tableId && extra.tableId === m.id) return true;
            if (extra.tableName && String(extra.tableName).trim().toLowerCase() === String(m.nombre).trim().toLowerCase()) return true;
            return false;
        });
        const lastCall = m.waiterCalls?.[0];
        const notas = String(lastCall?.notas || '').toLowerCase();
        const pideCuenta = !!lastCall && /cuenta|pagar|cobro/.test(notas);
        const llamaMesero = !!lastCall && !pideCuenta;
        const pendientes = m._count?.orderRequests || 0;

        let status: 'LIBRE' | 'OCUPADA' | 'CUENTA' | 'ATENCION' | 'INACTIVA' = 'LIBRE';
        if (!m.activa) status = 'INACTIVA';
        if (activeOrder) status = 'OCUPADA';
        if (llamaMesero || pendientes > 0) status = 'ATENCION';
        if (pideCuenta) status = 'CUENTA';
        return { ...m, status, activeOrder, pendientes, since: lastCall?.createdAt || activeOrder?.createdAt };
    });

    const mesasOcupadas = enrichedMesas.filter((m: any) => ['OCUPADA', 'CUENTA', 'ATENCION'].includes(m.status)).length;
    const mesasActivas = enrichedMesas.filter((m: any) => m.status !== 'INACTIVA').length;
    const alertasSalon = enrichedMesas.filter((m: any) => m.status === 'CUENTA' || m.status === 'ATENCION');

    // ── Pedidos en curso ──
    const nuevos = pedidosActivos.filter((p: any) => p.estado === 'RECIBIDO');
    const enCocina = pedidosActivos.filter((p: any) => ['ACEPTADO', 'EN_PREPARACION', 'PREPARACION', 'PRODUCTOS_CONFIRMADOS', 'CAMBIOS_ACEPTADOS'].includes(p.estado));
    const listos = pedidosActivos.filter((p: any) => ['LISTO', 'FULFILLMENT', 'ASIGNADO', 'EN_CAMINO'].includes(p.estado));
    const colaPedidos = [...pedidosActivos].sort((a: any, b: any) => {
        // Primero los nuevos (requieren aceptar), luego por antigüedad
        const ra = a.estado === 'RECIBIDO' ? 0 : 1;
        const rb = b.estado === 'RECIBIDO' ? 0 : 1;
        return ra - rb || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }).slice(0, 6);

    // ── Plan ──
    const sub = negocio?.Suscripcion;
    const planName = entitlements?.planName || sub?.Plan?.name || 'Restaurante';
    const planEstado = entitlements?.status || sub?.estado || 'active';
    const daysLeft = sub?.fechaFin ? Math.ceil((new Date(sub.fechaFin).getTime() - now.getTime()) / 86400000) : 0;

    const hora = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Guayaquil', hour: 'numeric', hour12: false }).format(now));
    const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
    const fechaLarga = new Intl.DateTimeFormat('es-EC', { timeZone: 'America/Guayaquil', weekday: 'long', day: 'numeric', month: 'long' }).format(now);

    const kpis = [
        {
            label: 'Ventas de hoy',
            value: money(ventasHoy),
            sub: deltaPct === null ? 'Sin ventas ayer a esta hora' : `${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs. ayer a esta hora`,
            trend: deltaPct === null ? null : deltaPct >= 0 ? 'up' : 'down',
            Icon: DollarSign,
        },
        { label: 'Pedidos de hoy', value: String(pedidosHoyCount), sub: `Ticket promedio ${money(ticketPromedio)}`, trend: null, Icon: Receipt },
        { label: 'En curso', value: String(pedidosActivos.length), sub: nuevos.length ? `${nuevos.length} por aceptar` : 'Todo aceptado', trend: null, Icon: ChefHat, alert: nuevos.length > 0 },
        { label: 'Salón', value: mesasActivas ? `${mesasOcupadas}/${mesasActivas}` : '—', sub: mesasActivas ? `${mesasActivas - mesasOcupadas} mesas libres` : 'Sin mesas configuradas', trend: null, Icon: Layout },
    ];

    const tableStyle: Record<string, { box: string; dot: string; label: string }> = {
        LIBRE: { box: 'bg-white ring-slate-200 hover:ring-slate-300', dot: 'bg-emerald-500', label: 'Libre' },
        OCUPADA: { box: 'bg-sky-50/60 ring-sky-200', dot: 'bg-sky-500', label: 'Ocupada' },
        ATENCION: { box: 'bg-amber-50 ring-amber-300', dot: 'bg-amber-500 animate-pulse', label: 'Llama al mesero' },
        CUENTA: { box: 'bg-rose-50 ring-rose-300', dot: 'bg-rose-500 animate-pulse', label: 'Pide la cuenta' },
        INACTIVA: { box: 'bg-slate-50 ring-slate-200 opacity-60', dot: 'bg-slate-300', label: 'Inactiva' },
    };

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Encabezado */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    {negocio?.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={negocio.logoUrl} alt="" className="size-14 rounded-2xl object-cover ring-1 ring-slate-200 bg-white shrink-0" />
                    ) : (
                        <div style={{ backgroundColor: brand }} className="size-14 rounded-2xl flex items-center justify-center text-white shrink-0">
                            <Utensils className="size-6" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-sm text-slate-500 first-letter:uppercase">{saludo} · {fechaLarga}</p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight truncate">{negocio?.nombre || 'Mi restaurante'}</h1>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href="/admin/pos" style={{ backgroundColor: brand }} className="inline-flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:opacity-90 active:scale-95 transition">
                        <ShoppingBag size={16} /> Nueva venta
                    </Link>
                    <Link href="/admin/cocina" className="inline-flex items-center gap-2 bg-slate-900 text-white hover:bg-black px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition">
                        <ChefHat size={16} /> Cocina
                    </Link>
                    <Link href="/admin/mesas" className="inline-flex items-center gap-2 bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition">
                        <Layout size={16} /> Salón
                    </Link>
                    {negocio?.slug && (
                        <Link href={`/${negocio.slug}`} target="_blank" className="inline-flex items-center gap-1.5 bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition">
                            Ver mi menú <ArrowUpRight size={15} />
                        </Link>
                    )}
                </div>
            </div>

            {/* Alertas que requieren acción */}
            {(nuevos.length > 0 || alertasSalon.length > 0) && (
                <div className="grid sm:grid-cols-2 gap-3">
                    {nuevos.length > 0 && (
                        <Link href="/admin/pedidos" className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 ring-1 ring-rose-200 hover:ring-rose-300 transition">
                            <span className="size-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0"><Inbox size={18} /></span>
                            <span className="flex-1 min-w-0">
                                <span className="block font-semibold text-rose-900">{nuevos.length === 1 ? '1 pedido nuevo por aceptar' : `${nuevos.length} pedidos nuevos por aceptar`}</span>
                                <span className="block text-sm text-rose-700/80">El más antiguo llegó {minutesAgo(nuevos[0].createdAt)}</span>
                            </span>
                            <ChevronRight size={18} className="text-rose-400" />
                        </Link>
                    )}
                    {alertasSalon.length > 0 && (
                        <Link href="/admin/mesas" className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 ring-1 ring-amber-200 hover:ring-amber-300 transition">
                            <span className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0"><Bell size={18} /></span>
                            <span className="flex-1 min-w-0">
                                <span className="block font-semibold text-amber-900">
                                    {alertasSalon.length === 1 ? `${alertasSalon[0].nombre} necesita atención` : `${alertasSalon.length} mesas necesitan atención`}
                                </span>
                                <span className="block text-sm text-amber-700/80 truncate">
                                    {alertasSalon.map((m: any) => `${m.nombre}: ${tableStyle[m.status].label.toLowerCase()}`).join(' · ')}
                                </span>
                            </span>
                            <ChevronRight size={18} className="text-amber-400" />
                        </Link>
                    )}
                </div>
            )}

            {/* Indicadores */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {kpis.map((k) => (
                    <div key={k.label} className={`bg-white rounded-2xl p-4 sm:p-5 ring-1 ${k.alert ? 'ring-rose-200' : 'ring-slate-200/80'}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">{k.label}</span>
                            <span style={{ color: brand, backgroundColor: `${brand}14` }} className="size-8 rounded-lg flex items-center justify-center">
                                <k.Icon size={16} />
                            </span>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 tabular-nums">{k.value}</p>
                        <p className={`text-xs mt-1 flex items-center gap-1 ${k.trend === 'up' ? 'text-emerald-600' : k.trend === 'down' ? 'text-rose-600' : k.alert ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                            {k.trend === 'up' && <TrendingUp size={13} />}
                            {k.trend === 'down' && <TrendingDown size={13} />}
                            {k.sub}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna principal */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Pedidos en curso */}
                    <section className="bg-white rounded-2xl ring-1 ring-slate-200/80">
                        <div className="flex items-center justify-between px-5 pt-5 pb-3">
                            <div>
                                <h2 className="font-semibold text-slate-900">Pedidos en curso</h2>
                                <p className="text-sm text-slate-500">
                                    {nuevos.length} nuevos · {enCocina.length} en cocina · {listos.length} listos o en camino
                                </p>
                            </div>
                            <Link href="/admin/pedidos" style={{ color: brand }} className="text-sm font-semibold flex items-center gap-0.5 shrink-0">
                                Ver todos <ChevronRight size={16} />
                            </Link>
                        </div>
                        {colaPedidos.length === 0 ? (
                            <div className="px-5 pb-8 pt-4 text-center">
                                <ChefHat className="size-8 text-slate-300 mx-auto" />
                                <p className="font-medium text-slate-700 mt-2">Cocina al día</p>
                                <p className="text-sm text-slate-500">Los pedidos nuevos aparecerán aquí.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {colaPedidos.map((p: any) => {
                                    const ch = channelOf(p);
                                    const st = STATE_LABEL[p.estado] || { label: p.estado, cls: 'bg-slate-50 text-slate-600 ring-slate-200' };
                                    const ChIcon = ch === 'MESA' ? Layout : ch === 'DOMICILIO' ? Truck : Store;
                                    const chLabel = ch === 'MESA' ? ((p.extraInfo as any)?.tableName || 'Mesa') : ch === 'DOMICILIO' ? 'Domicilio' : 'Retiro';
                                    return (
                                        <li key={p.id}>
                                            <Link href={ch === 'MESA' ? '/admin/cocina' : '/admin/pedidos'} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition">
                                                <span className="size-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                                    <ChIcon size={18} />
                                                </span>
                                                <span className="flex-1 min-w-0">
                                                    <span className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-slate-900">#{p.numeroPedido || p.id.slice(-4)}</span>
                                                        <span className="text-sm text-slate-500">{chLabel} · {p.nombreCliente}</span>
                                                    </span>
                                                    <span className="block text-sm text-slate-500 truncate">
                                                        {p.items?.map((it: any) => `${num(it.cantidad)}× ${it.nombreProducto}`).join(', ') || 'Sin productos'}
                                                    </span>
                                                </span>
                                                <span className="text-right shrink-0">
                                                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ring-1 ${st.cls}`}>{st.label}</span>
                                                    <span className="block text-xs text-slate-400 mt-1">{money(p.total)} · {minutesAgo(p.createdAt)}</span>
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    {/* Salón en vivo */}
                    <section className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-slate-900">Salón en vivo</h2>
                                <p className="text-sm text-slate-500">Toca una mesa para gestionarla.</p>
                            </div>
                            <Link href="/admin/mesas" style={{ color: brand }} className="text-sm font-semibold flex items-center gap-0.5">
                                Gestionar <ChevronRight size={16} />
                            </Link>
                        </div>
                        {enrichedMesas.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                                <QrCode className="size-8 text-slate-300 mx-auto" />
                                <p className="font-medium text-slate-700 mt-2">Aún no tienes mesas</p>
                                <p className="text-sm text-slate-500 max-w-sm mx-auto">Crea tus mesas para imprimir sus códigos QR y recibir pedidos desde el salón.</p>
                                <Link href="/admin/mesas" style={{ backgroundColor: brand }} className="inline-flex mt-4 px-4 py-2 rounded-xl text-white text-sm font-semibold">
                                    Crear mesas
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                                    {enrichedMesas.map((mesa: any) => {
                                        const s = tableStyle[mesa.status];
                                        return (
                                            <Link key={mesa.id} href="/admin/mesas" className={`rounded-xl ring-1 p-3 min-h-[86px] flex flex-col justify-between transition ${s.box}`}>
                                                <span className="flex items-start justify-between gap-1">
                                                    <span className="font-semibold text-slate-900 text-sm leading-tight">{mesa.nombre}</span>
                                                    <span className={`size-2 rounded-full shrink-0 mt-1 ${s.dot}`} />
                                                </span>
                                                <span className="text-xs text-slate-500 leading-tight">
                                                    {mesa.status === 'OCUPADA' && mesa.activeOrder ? money(mesa.activeOrder.total) : s.label}
                                                    {mesa.pendientes > 0 && <span className="block text-amber-700">{mesa.pendientes} por confirmar</span>}
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                    {(['LIBRE', 'OCUPADA', 'ATENCION', 'CUENTA'] as const).map((k) => (
                                        <span key={k} className="inline-flex items-center gap-1.5">
                                            <span className={`size-2 rounded-full ${tableStyle[k].dot.replace(' animate-pulse', '')}`} /> {tableStyle[k].label}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}
                    </section>
                </div>

                {/* Columna lateral */}
                <div className="space-y-6">
                    {/* Ventas por canal */}
                    <section className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-5 space-y-4">
                        <h2 className="font-semibold text-slate-900">Hoy por canal</h2>
                        {(
                            [
                                { k: 'MESA', label: 'En el salón', Icon: Layout },
                                { k: 'DOMICILIO', label: 'A domicilio', Icon: Truck },
                                { k: 'RETIRO', label: 'Para retirar', Icon: Store },
                            ] as const
                        ).map(({ k, label, Icon }) => {
                            const c = channels[k];
                            const pct = ventasHoy > 0 ? Math.round((c.total / ventasHoy) * 100) : 0;
                            return (
                                <div key={k} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-slate-700"><Icon size={15} className="text-slate-400" /> {label}</span>
                                        <span className="text-slate-900 font-medium tabular-nums">{money(c.total)} <span className="text-slate-400 font-normal">· {c.n}</span></span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div style={{ width: `${pct}%`, backgroundColor: brand }} className="h-full rounded-full" />
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    {/* Más vendidos */}
                    <section className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-slate-900">Más pedidos hoy</h2>
                            <Link href="/admin/reportes" className="text-sm text-slate-500 hover:text-slate-700">Reportes</Link>
                        </div>
                        {topItems.length === 0 ? (
                            <p className="text-sm text-slate-500">Todavía no hay platos vendidos hoy.</p>
                        ) : (
                            <ol className="space-y-2">
                                {topItems.map((t: any, i: number) => (
                                    <li key={t.nombreProducto} className="flex items-center gap-3 text-sm">
                                        <span style={i === 0 ? { backgroundColor: brand, color: '#fff' } : undefined} className={`size-6 rounded-md flex items-center justify-center text-xs font-bold ${i === 0 ? '' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                                        <span className="flex-1 truncate text-slate-700">{t.nombreProducto}</span>
                                        <span className="font-medium text-slate-900 tabular-nums">{num(t._sum?.cantidad)}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>

                    <PlanStatusCard
                        planName={planName}
                        estado={planEstado}
                        daysLeft={daysLeft}
                        limits={entitlements?.limits}
                        usage={{
                            ordersMonthly: pedidosMesCount,
                            orders: pedidosMesCount,
                            staff: entitlements?.usage?.professionals ?? 0,
                            tables: mesas.length,
                        }}
                        capabilities={entitlements?.capabilities}
                        tipoNegocio="RESTAURANTE"
                    />

                    {/* Accesos rápidos */}
                    <section className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-2">
                        {[
                            { href: '/admin/productos', label: 'Menú: platos y bebidas', Icon: Utensils },
                            { href: '/admin/caja', label: 'Caja y cierre del día', Icon: DollarSign },
                            { href: '/admin/mesas', label: 'Códigos QR de mesas', Icon: QrCode },
                            { href: '/admin/meseros', label: 'Meseros', Icon: Users },
                            { href: '/admin/inventario', label: 'Inventario', Icon: Package },
                        ].map(({ href, label, Icon }) => (
                            <Link key={href + label} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition text-sm text-slate-700">
                                <Icon size={17} className="text-slate-400" />
                                <span className="flex-1">{label}</span>
                                <ChevronRight size={15} className="text-slate-300" />
                            </Link>
                        ))}
                    </section>
                </div>
            </div>
        </div>
    );
}
