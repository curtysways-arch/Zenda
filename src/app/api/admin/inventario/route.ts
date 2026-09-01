import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all'; // all, low_stock, out_of_stock, variants, simple
    const search = (searchParams.get('search') || '').toLowerCase().trim();

    // Obtener todos los productos del negocio
    const productos = await (prisma as any).producto.findMany({
      where: { negocioId },
      include: {
        categoria: true,
        variantes: true
      },
      orderBy: { nombre: 'asc' }
    });

    const inventoryItems: any[] = [];

    for (const prod of productos) {
      if (prod.tieneVariantes) {
        for (const v of prod.variantes || []) {
          inventoryItems.push({
            id: v.id,
            productId: prod.id,
            variantId: v.id,
            nombreProducto: prod.nombre,
            nombreVariante: v.nombre,
            nombreCompleto: `${prod.nombre} (${v.nombre})`,
            sku: v.sku || prod.sku || 'Sin SKU',
            categoria: prod.categoria?.nombre || 'Sin Categoría',
            precio: v.precio ?? prod.precio,
            stock: v.stock ?? 0,
            isVariant: true,
            activo: v.activo && prod.activo,
            lastUpdated: v.updatedAt || prod.updatedAt
          });
        }
      } else {
        inventoryItems.push({
          id: prod.id,
          productId: prod.id,
          variantId: null,
          nombreProducto: prod.nombre,
          nombreVariante: 'Producto Simple',
          nombreCompleto: prod.nombre,
          sku: prod.sku || 'Sin SKU',
          categoria: prod.categoria?.nombre || 'Sin Categoría',
          precio: prod.precio,
          stock: prod.stock ?? 0,
          isVariant: false,
          activo: prod.activo,
          lastUpdated: prod.updatedAt
        });
      }
    }

    // Filtrado
    let filtered = inventoryItems;

    if (search) {
      filtered = filtered.filter(item =>
        item.nombreCompleto.toLowerCase().includes(search) ||
        item.sku.toLowerCase().includes(search) ||
        item.categoria.toLowerCase().includes(search)
      );
    }

    if (filter === 'low_stock') {
      filtered = filtered.filter(item => item.stock > 0 && item.stock <= 3);
    } else if (filter === 'out_of_stock') {
      filtered = filtered.filter(item => item.stock === 0);
    } else if (filter === 'variants') {
      filtered = filtered.filter(item => item.isVariant);
    } else if (filter === 'simple') {
      filtered = filtered.filter(item => !item.isVariant);
    }

    return NextResponse.json({
      items: filtered,
      summary: {
        totalItems: inventoryItems.length,
        outOfStock: inventoryItems.filter(i => i.stock === 0).length,
        lowStock: inventoryItems.filter(i => i.stock > 0 && i.stock <= 3).length,
        normalStock: inventoryItems.filter(i => i.stock > 3).length
      }
    });
  } catch (e: any) {
    console.error('[API_INVENTARIO_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al obtener inventario' }, { status: 500 });
  }
}

// POST: Ajuste de stock manual con historial de trazabilidad
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  const usuarioNombre = session.user.name || session.user.email || 'Admin';

  try {
    const body = await req.json();
    const { variantId, productId, tipoMovimiento, cantidad, motivo } = body;

    if ((!variantId && !productId) || !tipoMovimiento || cantidad === undefined || !motivo) {
      return NextResponse.json({ error: 'Datos incompletos para el ajuste de inventario' }, { status: 400 });
    }

    const cantNum = parseInt(String(cantidad));
    if (isNaN(cantNum)) {
      return NextResponse.json({ error: 'La cantidad debe ser un número válido' }, { status: 400 });
    }

    let resultItem: any = null;

    if (variantId) {
      // Validar variante y tenant
      const variante = await (prisma as any).productoVariante.findUnique({
        where: { id: variantId },
        include: { producto: true }
      });

      if (!variante || variante.producto.negocioId !== negocioId) {
        return NextResponse.json({ error: 'Variante no encontrada o no pertenece al negocio' }, { status: 403 });
      }

      const stockActual = variante.stock ?? 0;
      let nuevoStock = stockActual;

      if (tipoMovimiento === 'ENTRADA') {
        nuevoStock = stockActual + Math.abs(cantNum);
      } else if (tipoMovimiento === 'SALIDA') {
        nuevoStock = Math.max(0, stockActual - Math.abs(cantNum));
      } else if (tipoMovimiento === 'AJUSTE_ABSOLUTO') {
        nuevoStock = Math.max(0, cantNum);
      }

      // Registro de trazabilidad
      const logEntry = {
        fecha: new Date().toISOString(),
        usuario: usuarioNombre,
        tipoMovimiento,
        stockAnterior: stockActual,
        cantidadModificada: nuevoStock - stockActual,
        stockNuevo: nuevoStock,
        motivo
      };

      resultItem = await (prisma as any).productoVariante.update({
        where: { id: variantId },
        data: {
          stock: nuevoStock,
          updatedAt: new Date()
        }
      });
    } else {
      // Producto simple
      const producto = await (prisma as any).producto.findUnique({ where: { id: productId } });

      if (!producto || producto.negocioId !== negocioId) {
        return NextResponse.json({ error: 'Producto no encontrado o no pertenece al negocio' }, { status: 403 });
      }

      const stockActual = producto.stock ?? 0;
      let nuevoStock = stockActual;

      if (tipoMovimiento === 'ENTRADA') {
        nuevoStock = stockActual + Math.abs(cantNum);
      } else if (tipoMovimiento === 'SALIDA') {
        nuevoStock = Math.max(0, stockActual - Math.abs(cantNum));
      } else if (tipoMovimiento === 'AJUSTE_ABSOLUTO') {
        nuevoStock = Math.max(0, cantNum);
      }

      resultItem = await (prisma as any).producto.update({
        where: { id: productId },
        data: {
          stock: nuevoStock,
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Ajuste de inventario procesado correctamente',
      item: resultItem
    });
  } catch (e: any) {
    console.error('[API_INVENTARIO_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al procesar ajuste de inventario' }, { status: 500 });
  }
}
