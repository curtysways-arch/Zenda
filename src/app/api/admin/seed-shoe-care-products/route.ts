import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const CANONICAL_PRODUCTS = [
  {
    nombre: 'Espuma Limpiadora Bubble Clean (250ml)',
    descripcion: 'Formula activa de limpieza instantanea y secado ultra rapido. Segura en malla, cuero, lona y sinteticos.',
    precio: 12.50,
    stock: 25,
    categoriaName: 'Limpieza',
    imagenUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80',
  },
  {
    nombre: 'Impermeabilizante Nano Protector (200ml)',
    descripcion: 'Capa molecular invisible que repele agua, lluvia, cafe, salsas y suciedad extrema hasta por 4 semanas.',
    precio: 14.00,
    stock: 18,
    categoriaName: 'Proteccion',
    imagenUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80',
  },
  {
    nombre: 'Cepillo de Cerdas Suaves de Cerdo',
    descripcion: 'Cerdas naturales extra suaves para limpiar telas premium, gamuza y nobuk sin raspar.',
    precio: 6.50,
    stock: 30,
    categoriaName: 'Accesorios',
    imagenUrl: 'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?w=500&q=80',
  },
  {
    nombre: 'Cordones Premium Reflectivos 3M (Par)',
    descripcion: 'Laces de alta densidad con filamentos reflectivos para maxima visibilidad nocturna.',
    precio: 5.00,
    stock: 40,
    categoriaName: 'Estilo',
    imagenUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&q=80',
  },
];

export async function GET() {
  const session = await getEffectiveAdminSession();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const negocioId = (session.user as any).negocioId;
  if (!negocioId) return NextResponse.json({ error: 'Sin negocioId' }, { status: 400 });
  const results: any[] = [];
  for (let i = 0; i < CANONICAL_PRODUCTS.length; i++) {
    const p = CANONICAL_PRODUCTS[i];
    let categoria = await (prisma as any).categoriaProducto.findFirst({ where: { negocioId, nombre: p.categoriaName } });
    if (!categoria) {
      categoria = await (prisma as any).categoriaProducto.create({ data: { negocioId, nombre: p.categoriaName, activo: true } });
    }
    const existing = await (prisma as any).producto.findFirst({ where: { negocioId, nombre: p.nombre } });
    if (existing) { results.push({ nombre: p.nombre, status: 'ya_existe', id: existing.id }); continue; }
    const created = await (prisma as any).producto.create({
      data: { negocioId, nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, activo: true, imagenUrl: p.imagenUrl, categoriaId: categoria.id, orden: i, updatedAt: new Date() }
    });
    if (p.stock > 0) {
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
          productId: created.id,
          type: 'INICIAL',
          quantity: p.stock,
          reason: 'Carga inicial de producto seed'
        });
      } catch (seedErr) {
        console.warn(`[SEED_SHOE_CARE_STOCK_ERROR] ${p.nombre}:`, seedErr);
      }
    }
    results.push({ nombre: p.nombre, status: 'creado', id: created.id });
  }
  return NextResponse.json({ success: true, negocioId, results });
}
