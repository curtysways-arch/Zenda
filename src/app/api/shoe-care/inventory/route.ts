import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || searchParams.get('negocioId') || 'demo-canchas';

    const items = await prisma.producto.findMany({
      where: { negocioId: businessId },
      include: { categoria: true },
      orderBy: { orden: 'asc' }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Error obteniendo inventario' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { negocioId = 'demo-canchas', nombre, descripcion, precio = 0, stock = 10, activo = true } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre del insumo es requerido' }, { status: 400 });
    }

    const initialStock = parseFloat(stock.toString()) || 0;
    const item = await prisma.producto.create({
      data: {
        negocioId,
        nombre,
        descripcion: descripcion || null,
        precio: parseFloat(precio.toString()) || 0,
        activo: activo !== undefined ? activo : true,
        updatedAt: new Date()
      }
    });

    if (initialStock > 0) {
      try {
        const { InventoryEngine } = await import('@/core/inventory/InventoryEngine');
        let warehouse = await (prisma as any).warehouse.findFirst({
          where: { businessId: negocioId, isDefault: true, active: true }
        });
        if (!warehouse) {
          warehouse = await (prisma as any).warehouse.findFirst({
            where: { businessId: negocioId, active: true }
          });
        }
        await InventoryEngine.recordMovement({
          businessId: negocioId,
          warehouseId: warehouse?.id || undefined,
          branchId: warehouse?.branchId || undefined,
          productId: item.id,
          quantity: initialStock,
          type: 'INICIAL',
          reason: 'Inventario inicial de nuevo insumo shoe-care'
        });
      } catch (stockErr) {
        console.warn(`[SHOE_CARE_INIT_STOCK_ERROR] ${nombre}:`, stockErr);
      }
    }

    const updatedItem = await prisma.producto.findUnique({
      where: { id: item.id }
    });

    return NextResponse.json(updatedItem || item, { status: 201 });
  } catch (error) {
    console.error('Error creando insumo:', error);
    return NextResponse.json({ error: 'Error al agregar insumo al inventario' }, { status: 500 });
  }
}
