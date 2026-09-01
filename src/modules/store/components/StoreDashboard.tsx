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

  // Consultas paralelas multi-tenant aisladas por negocioId
  const [
    ventasHoyData,
    ventas7DiasData,
    ventasMesData,
    pedidosNuevosCount,
    pedidosPendientesCount,
    pedidosEnviadosCount,
    pedidosEntregadosCount,
    productosActivosCount,
    productosSimpleStockBajo,
    variantesStockBajo,
    clientesCount,
    pedidosRecientes,
    negocio
  ] = await Promise.all([
    // 1. Ventas de Hoy
    (prisma as any).pedido.aggregate({
      where: { negocioId, createdAt: { gte: startToday, lte: endToday }, estado: { not: 'CANCELADO' } },
      _sum: { total: true }
    }),
    // 2. Ventas últimos 7 días
    (prisma as any).pedido.aggregate({
      where: { negocioId, createdAt: { gte: start7Days }, estado: { not: 'CANCELADO' } },
      _sum: { total: true }
    }),
    // 3. Ventas del Mes
    (prisma as any).pedido.aggregate({
      where: { negocioId, createdAt: { gte: startMonth }, estado: { not: 'CANCELADO' } },
      _sum: { total: true }
    }),
    // 4. Pedidos Nuevos
    (prisma as any).pedido.count({ where: { negocioId, estado: 'RECIBIDO' } }),
    // 5. Pedidos Pendientes de Pago / Revisión
    (prisma as any).pedido.count({ where: { negocioId, estado: 'PENDIENTE' } }),
    // 6. Pedidos Enviados / En Ruta
    (prisma as any).pedido.count({ where: { negocioId, estado: { in: ['ENVIADO', 'RUTA'] } } }),
    // 7. Pedidos Entregados (Mes)
    (prisma as any).pedido.count({ where: { negocioId, estado: 'ENTREGADO', createdAt: { gte: startMonth } } }),
    // 8. Productos Activos
    (prisma as any).producto.count({ where: { negocioId, activo: true } }),
    // 9. Productos simples con stock <= 3
    (prisma as any).producto.findMany({
      where: { negocioId, activo: true, tieneVariantes: false, stock: { lte: 3 } },
      select: { id: true, nombre: true, sku: true, stock: true },
      take: 5
    }),
    // 10. Variantes con stock <= 3
    (prisma as any).productoVariante.findMany({
      where: { producto: { negocioId }, activo: true, stock: { lte: 3 } },
      select: { id: true, nombre: true, sku: true, stock: true, producto: { select: { nombre: true } } },
      take: 5
    }),
    // 11. Clientes
    prisma.cliente.count({ where: { negocioId } }),
    // 12. Pedidos Recientes
    (prisma as any).pedido.findMany({
      where: { negocioId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { items: true }
    }),
    // 13. Datos del Negocio
    prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { nombre: true, colorPrimario: true, slug: true }
    })
  ]);

  const ventasHoy = ventasHoyData._sum.total || 0;
  const ventas7Dias = ventas7DiasData._sum.total || 0;
  const ventasMes = ventasMesData._sum.total || 0;

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
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">{negocio?.nombre || 'Mi Tienda'}</h1>
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
          <div className="flex items-center gap-2 mt-2">
            {stockAgotadosCount > 0 ? (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {stockAgotadosCount} Agotados
              </span>
            ) : (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Stock Saludable
              </span>
            )}
            <span className="text-xs text-slate-400">• {clientesCount} Clientes</span>
          </div>
        </div>
      </div>

      {/* Grid de Secciones Operativas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tabla de Pedidos Recientes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Últimos Pedidos de la Tienda</h2>
              <p className="text-xs text-slate-500">Monitoreo directo del flujo comercial e-commerce</p>
            </div>
            <Link
              href="/admin/pedidos-online"
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 hover:underline"
            >
              Ver todos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {pedidosRecientes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
              <p className="font-medium text-slate-600">Aún no hay pedidos registrados en tu tienda</p>
              <p className="text-xs text-slate-400 mt-1">Los pedidos recibidos desde /tienda aparecerán aquí instantáneamente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3">Pedido</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3 text-center">Ítems</th>
                    <th className="pb-3 text-right">Total</th>
                    <th className="pb-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedidosRecientes.map((order: any) => {
                    const extra = (order.extraInfo as any) || {};
                    const isDelivery = extra.tipoEntrega !== 'PICKUP';
                    const itemsCount = (order.items || []).reduce((acc: number, item: any) => acc + item.cantidad, 0);

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 font-bold text-slate-900">
                          #{order.id.slice(-6).toUpperCase()}
                          <div className="text-[11px] font-normal text-slate-400 flex items-center gap-1">
                            {isDelivery ? <Truck className="w-3 h-3 text-slate-400" /> : <Package className="w-3 h-3 text-slate-400" />}
                            {isDelivery ? 'Delivery' : 'Retiro en Tienda'}
                          </div>
                        </td>
                        <td className="py-3.5">
                          <div className="font-semibold text-slate-800">{order.clienteNombre || order.cliente?.nombre || 'Cliente General'}</div>
                          <div className="text-[11px] text-slate-400">{order.clienteTelefono || 'Sin teléfono'}</div>
                        </td>
                        <td className="py-3.5 text-center font-semibold text-slate-700">
                          {itemsCount}
                        </td>
                        <td className="py-3.5 text-right font-black text-slate-900">
                          ${order.total.toFixed(2)}
                        </td>
                        <td className="py-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              order.estado === 'ENTREGADO'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : order.estado === 'CANCELADO'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                : order.estado === 'ENVIADO' || order.estado === 'RUTA'
                                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200/60'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            }`}
                          >
                            {order.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Columna Derecha: Alertas de Stock Crítico & Accesos Rápidos */}
        <div className="space-y-6">
          {/* Widget de Alerta de Stock Crítico */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-base">Alertas de Inventario</h3>
              </div>
              <Link href="/admin/inventario" className="text-xs font-bold text-cyan-600 hover:underline">
                Gestionar
              </Link>
            </div>

            {stockAlerts.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Todos los productos tienen existencias adecuadas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stockAlerts.map((item, idx) => (
                  <div
                    key={item.id + idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 line-clamp-1">{item.nombre}</div>
                      <div className="text-slate-400 flex items-center gap-1.5">
                        <span className="font-mono text-[11px] bg-slate-200/60 px-1.5 py-0.5 rounded">{item.sku}</span>
                        <span>• {item.variante}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-black px-2 py-0.5 rounded-md text-xs ${
                          item.stock === 0
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.stock === 0 ? 'AGOTADO' : `${item.stock} en stock`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accesos Rápidos Comercial */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-md space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Administración Comercial</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/admin/productos"
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center text-center gap-1.5 border border-white/5"
              >
                <Package className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-semibold">Catálogo</span>
              </Link>
              <Link
                href="/admin/inventario"
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center text-center gap-1.5 border border-white/5"
              >
                <Box className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-semibold">Inventario</span>
              </Link>
              <Link
                href="/admin/categorias"
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center text-center gap-1.5 border border-white/5"
              >
                <Tags className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-semibold">Categorías</span>
              </Link>
              <Link
                href="/admin/config"
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center text-center gap-1.5 border border-white/5"
              >
                <Settings className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-semibold">Ajustes</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
