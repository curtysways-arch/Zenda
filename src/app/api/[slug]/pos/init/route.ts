import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CashSessionService } from '@/core/cash/CashSessionService';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const negocio = await (prisma as any).negocio.findUnique({
      where: { slug },
      select: {
        id: true,
        nombre: true,
        slug: true,
        logoUrl: true,
        tipoNegocio: true,
        configuracion: true
      }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    // 1. Categorías
    const categorias = await (prisma as any).categoriaProducto.findMany({
      where: { negocioId: negocio.id, activo: true },
      orderBy: { orden: 'asc' }
    });

    // 2. Productos
    const productos = await (prisma as any).producto.findMany({
      where: {
        negocioId: negocio.id,
        activo: true,
        tipoProducto: { in: ['VENTA', 'TERMINADO'] }
      },
      include: {
        categoria: true,
        variantes: { where: { activo: true } }
      },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }]
    });

    // 3. Sesión activa de caja
    const activeSession = await CashSessionService.getActiveSession(negocio.id);

    return NextResponse.json({
      success: true,
      negocio,
      categorias,
      productos,
      cashSession: activeSession
    });
  } catch (e: any) {
    console.error('[API_POS_INIT_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al inicializar POS' }, { status: 500 });
  }
}
