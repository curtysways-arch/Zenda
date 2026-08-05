import { NextResponse } from 'next/server';
import { ServiceEngine } from '@/core/services/ServiceEngine';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { estado, photoUrl, photoType, repartidorNombre, notas } = body;

    const pedido = await prisma.pedido.findUnique({ where: { id } });
    if (!pedido) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const currentExtra = (pedido.extraInfo as any) || {};
    let updatedExtra = { ...currentExtra };

    if (repartidorNombre) {
      updatedExtra.repartidorNombre = repartidorNombre;
    }

    if (photoUrl && photoType) {
      const key = photoType === 'RECEPCION' ? 'fotosRecepcion'
        : photoType === 'PROCESO' ? 'fotosProceso'
        : photoType === 'RETIRO' ? 'fotosRetiro'
        : 'fotosEntrega';

      const currentArr = Array.isArray(updatedExtra[key]) ? updatedExtra[key] : [];
      updatedExtra[key] = [...currentArr, photoUrl];
    }

    const updated = await prisma.pedido.update({
      where: { id },
      data: {
        estado: estado || pedido.estado,
        notas: notas !== undefined ? notas : pedido.notas,
        extraInfo: updatedExtra
      }
    });

    console.log(`📱 [WhatsApp Notify] Orden #${updated.numeroPedido} cambió a estado: ${estado || pedido.estado}`);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error actualizando estado de orden:', error);
    return NextResponse.json({ error: 'Error al cambiar estado de la orden' }, { status: 500 });
  }
}
