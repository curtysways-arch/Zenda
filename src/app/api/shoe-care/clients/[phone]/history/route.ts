import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireBusinessAccess } from '@/lib/auth/requireBusinessAccess';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ phone: string }> }) {
  try {
    const { phone } = await params;
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || searchParams.get('negocioId');

    // Historial de un cliente: solo el personal de ese negocio.
    if (!businessId) return NextResponse.json({ error: 'Falta el negocio.' }, { status: 400 });
    const access = await requireBusinessAccess(businessId);
    if (!access.ok) return access.response;

    const whereClause: any = { telefonoCliente: phone, negocioId: businessId };

    const ordenes = await prisma.pedido.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    const cliente = await prisma.cliente.findUnique({ where: { telefono_negocioId: { telefono: phone, negocioId: businessId } } });

    const totalSpent = ordenes.reduce((sum, o) => sum + (o.estado === 'ENTREGADO' ? o.total : 0), 0);
    const totalOrders = ordenes.length;
    const completedOrders = ordenes.filter(o => o.estado === 'ENTREGADO').length;

    // Extraer todas las fotos históricas de recepción y entrega
    const allPhotos: Array<{ url: string; tipo: string; fecha: string; orderNum: number }> = [];
    ordenes.forEach(o => {
      const extra = (o.extraInfo as any) || {};
      if (Array.isArray(extra.fotosRecepcion)) {
        extra.fotosRecepcion.forEach((url: string) => allPhotos.push({ url, tipo: 'RECEPCIÓN', fecha: o.createdAt.toISOString(), orderNum: o.numeroPedido }));
      }
      if (Array.isArray(extra.fotosEntrega)) {
        extra.fotosEntrega.forEach((url: string) => allPhotos.push({ url, tipo: 'ENTREGA', fecha: o.createdAt.toISOString(), orderNum: o.numeroPedido }));
      }
    });

    return NextResponse.json({
      cliente,
      metrics: {
        totalOrders,
        completedOrders,
        totalSpent,
        lastCleaningDate: ordenes.length > 0 ? ordenes[0].createdAt : null
      },
      photos: allPhotos,
      ordenes
    });
  } catch (error: any) {
    console.error('Error fetching client history:', error);
    return NextResponse.json({ error: 'Error al obtener historial del cliente' }, { status: 500 });
  }
}
