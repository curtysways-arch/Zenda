import prisma from '@/lib/prisma';
import { 
  ShoppingBag, DollarSign, Users, Package, TrendingUp, Clock, 
  ChevronRight, ArrowUpRight, AlertTriangle, CheckCircle2, Truck, 
  Layers, Tags, Settings, Sparkles, Box, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { startOfMonth, subDays } from 'date-fns';

interface Props {
  negocioId: string;
  role: string;
}

export default async function StoreDashboard({ negocioId, role }: Props) {
  const now = new Date();
  const startToday = new Date(new Date().setUTCHours(0, 0, 0, 0));
  const endToday = new Date(new Date().setUTCHours(23, 59, 59, 999));
  const start7Days = subDays(now, 7);
  const startMonth = startOfMonth(now);

  let ventasHoyData: any = { _sum: { total: 0 } };
  let ventas7DiasData: any = { _sum: { total: 0 } };
  let ventasMesData: any = { _sum: { total: 0 } };
  let pedidosNuevosCount = 0;
  let pedidosPendientesCount = 0;
  let pedidosEnviadosCount = 0;
  let pedidosEntregadosCount = 0;
  let productosActivosCount = 0;
  let productosSimpleStockBajo: any[] = [];
  let variantesStockBajo: any[] = [];
  let clientesCount = 0;
  let pedidosRecientes: any[] = [];
  let negocio: any = null;

  try {
    // Usar Promise.allSettled para resiliencia absoluta ante diferencias de esquema en producción
    const results = await Promise.allSettled([
      // 0. Ventas de Hoy
      (prisma as any).pedido.aggregate({
        where: { negocioId, createdAt: { gte: startToday, lte: endToday }, estado: { not: 'CANCELADO' } },
        _sum: { total: true }
      }),
      // 1. Ventas últimos 7 días
      (prisma as any).pedido.aggregate({
        where: { negocioId, createdAt: { gte: start7Days }, estado: { not: 'CANCELADO' } },
        _sum: { total: true }
      }),
      // 2. Ventas del Mes
      (prisma as any).pedido.aggregate({
        where: { negocioId, createdAt: { gte: startMonth }, estado: { not: 'CANCELADO' } },
        _sum: { total: true }
      }),
      // 3. Pedidos Nuevos
      (prisma as any).pedido.count({ where: { negocioId, estado: 'RECIBIDO' } }),
      // 4. Pedidos Pendientes de Pago / Revisión
      (prisma as any).pedido.count({ where: { negocioId, estado: 'PENDIENTE' } }),
      // 5. Pedidos Enviados / En Ruta
      (prisma as any).pedido.count({ where: { negocioId, estado: { in: ['ENVIADO', 'RUTA'] } } }),
      // 6. Pedidos Entregados (Mes)
      (prisma as any).pedido.count({ where: { negocioId, estado: 'ENTREGADO', createdAt: { gte: startMonth } } }),
      // 7. Productos Activos
      (prisma as any).producto.count({ where: { negocioId, activo: true } }),
      // 8. Productos simples con stock <= 3
      (prisma as any).producto.findMany({
        where: { negocioId, activo: true, stock: { lte: 3 } },
        select: { id: true, nombre: true, stock: true },
        take: 5
      }),
      // 9. Variantes con stock <= 3
      (prisma as any).productoVariante.findMany({
        where: { producto: { negocioId }, activo: true, stock: { lte: 3 } },
        select: { id: true, nombre: true, stock: true, producto: { select: { nombre: true } } },
        take: 5
      }),
      // 10. Clientes
      prisma.cliente.count({ where: { negocioId } }),
      // 11. Pedidos Recientes
      (prisma as any).pedido.findMany({
        where: { negocioId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { items: true }
      }),
      // 12. Datos del Negocio
      prisma.negocio.findUnique({
        where: { id: negocioId },
        select: { nombre: true, colorPrimario: true, slug: true }
      })
    ]);

    if (results[0].status === 'fulfilled' && results[0].value) ventasHoyData = results[0].value;
    if (results[1].status === 'fulfilled' && results[1].value) ventas7DiasData = results[1].value;
    if (results[2].status === 'fulfilled' && results[2].value) ventasMesData = results[2].value;
    if (results[3].status === 'fulfilled') pedidosNuevosCount = results[3].value || 0;
    if (results[4].status === 'fulfilled') pedidosPendientesCount = results[4].value || 0;
    if (results[5].status === 'fulfilled') pedidosEnviadosCount = results[5].value || 0;
    if (results[6].status === 'fulfilled') pedidosEntregadosCount = results[6].value || 0;
    if (results[7].status === 'fulfilled') productosActivosCount = results[7].value || 0;
    if (results[8].status === 'fulfilled') productosSimpleStockBajo = results[8].value || [];
    if (results[9].status === 'fulfilled') variantesStockBajo = results[9].value || [];
    if (results[10].status === 'fulfilled') clientesCount = results[10].value || 0;
    if (results[11].status === 'fulfilled') pedidosRecientes = results[11].value || [];
    if (results[12].status === 'fulfilled') negocio = results[12].value || null;
  } catch (e) {
    console.error("StoreDashboard query error:", e);
  }

  const ventasHoy = ventasHoyData?._sum?.total || 0;
  const ventas7Dias = ventas7DiasData?._sum?.total || 0;
  const ventasMes = ventasMesData?._sum?.total || 0;

  // Unificar productos simples y variantes en alerta de stock
  const stockAlerts = [
    ...(productosSimpleStockBajo || []).map((p: any) => ({
      id: p.id,
      nombre: p.nombre,
      variante: 'Producto Simple',
      sku: p.sku || 'N/A',
      stock: p.stock ?? 0,
      isVariant: false
    })),
    ...(variantesStockBajo || []).map((v: any) => ({
      id: v.id,
      nombre: v.producto?.nombre || 'Producto',
      variante: v.nombre,
      sku: v.sku || 'N/A',
      stock: v.stock ?? 0,
      isVariant: true
    }))
  ].slice(0, 6);

  const stockAgotadosCount = stockAlerts.filter(i => i.stock === 0).length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header del Dashboard de Tienda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              E-Commerce Admin
            </span>
            <span className="text-slate-400 text-sm">| Multi-Tenant Isolated</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white" style={{ color: '#ffffff' }}>{negocio?.nombre || 'Mi Tienda'}</h1>
          <p className="text-slate-300 text-sm mt-1">Panel de control comercial, inventario y despacho online</p>
        </div>

        {/* Acciones Rápidas Header */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/productos"
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </Link>
          <Link
            href="/admin/inventario"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all flex items-center gap-2"
          >
            <Box className="w-4 h-4 text-cyan-400" />
            <span>Ajustar Inventario</span>
          </Link>
          <Link
            href={`/${negocio?.slug || 'tienda'}`}
            target="_blank"
            className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition-all flex items-center gap-1.5"
          >
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Ver Tienda</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Ventas Hoy */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ventas de Hoy</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">${ventasHoy.toFixed(2)}</div>
          <p className="text-xs text-slate-500 mt-2 font-medium">Últimos 7 días: ${ventas7Dias.toFixed(2)}</p>
        </div>

        {/* Ventas Mes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ventas del Mes</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">${ventasMes.toFixed(2)}</div>
          <p className="text-xs text-slate-500 mt-2 font-medium">{pedidosEntregadosCount} pedidos entregados</p>
        </div>

        {/* Estado Pedidos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado de Pedidos</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{pedidosNuevosCount + pedidosPendientesCount}</span>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pendientes</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium">{pedidosEnviadosCount} pedidos en ruta de entrega</p>
        </div>

        {/* Control Inventario */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catálogo & Stock</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{productosActivosCount}</div>
          <div className="flex items-center gap-2 mt-2 text-xs font-medium">
            {stockAgotadosCount > 0 ? (
              <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {stockAgotadosCount} Agotados
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">Stock Normal</span>
            )}
            <span className="text-slate-400">• {clientesCount} Clientes</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Pedidos Recientes + Alertas de Inventario */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Pedidos Recientes */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Últimos Pedidos de la Tienda</h2>
              <p className="text-xs text-slate-500 font-medium">Monitoreo directo del flujo comercial e-commerce</p>
            </div>
            <Link
              href="/admin/ventas"
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {pedidosRecientes.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {pedidosRecientes.map((ped: any) => {
                const badgeColor = 
                  ped.estado === 'ENTREGADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  ped.estado === 'RECIBIDO' || ped.estado === 'PENDIENTE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  ped.estado === 'ENVIADO' || ped.estado === 'RUTA' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                  'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <div key={ped.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs shrink-0">
                        #{ped.numeroPedido || ped.id.slice(-4)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{ped.nombreCliente || 'Cliente'}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                            {ped.estado}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ped.items?.length || 0} productos • {new Date(ped.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <div className="font-black text-slate-900 text-base">${(ped.total || 0).toFixed(2)}</div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{ped.tipoEntrega || 'DOMICILIO'}</span>
                      </div>
                      <Link
                        href={`/admin/ventas?id=${ped.id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                      >
                        Detalle
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Aún no hay pedidos registrados en tu tienda</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Los pedidos recibidos desde /tienda aparecerán aquí instantáneamente.
              </p>
            </div>
          )}
        </div>

        {/* Columna Derecha: Alertas de Inventario Crítico */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6 h-fit">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-black text-slate-900">Alertas de Inventario</h2>
            </div>
            <Link href="/admin/inventario" className="text-xs font-bold text-cyan-600 hover:text-cyan-700">
              Gestionar
            </Link>
          </div>

          {stockAlerts.length > 0 ? (
            <div className="space-y-3">
              {stockAlerts.map((item: any) => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.nombre}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.sku} • {item.variante}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-black shrink-0 ${item.stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                    {item.stock === 0 ? 'AGOTADO' : `${item.stock} en stock`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Inventario 100% Saludable</p>
              <p className="text-[11px] text-slate-400">No hay productos en riesgo de agotarse.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
