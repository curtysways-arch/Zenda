import { NextResponse } from 'next/server';
import { ServiceEngine } from '@/core/services/ServiceEngine';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      nivelSuciedad, // 'POCO' ($4) | 'MEDIO' ($6) | 'ALTO' ($8) | 'RESTAURACION' ($10)
      precioBase,
      serviciosAdicionales, // Array<{ nombre: string, precio: number }>
      costoRetiro,
      costoEntrega,
      fechaHoraEntregaEstimada,
      notasInspeccion
    } = body;

    const baseMap: Record<string, number> = {
      POCO: 4.00,
      MEDIO: 6.00,
      ALTO: 8.00,
      RESTAURACION: 10.00
    };

    const baseFinal = precioBase !== undefined ? Number(precioBase) : (baseMap[nivelSuciedad] || 6.00);

    const result = await ServiceEngine.processInspection({
      pedidoId: id,
      nivelSuciedad: nivelSuciedad || 'MEDIO',
      precioBase: baseFinal,
      serviciosAdicionales: serviciosAdicionales || [],
      costoRetiro: Number(costoRetiro) || 0,
      costoEntrega: Number(costoEntrega) || 0,
      fechaHoraEntregaEstimada,
      notasInspeccion
    });

    // Simulación de envío de WhatsApp automático con el desglose y fecha estimada de entrega
    console.log(`📱 [WhatsApp Client Notify] Cotización Confirmada para la Orden #${result.pedido.numeroPedido}:`);
    console.log(`• Resumen: Calzado ${nivelSuciedad} sucio ($${baseFinal})`);
    console.log(`• Total: $${result.breakdown.total.toFixed(2)}`);
    console.log(`• Entrega estimada: ${fechaHoraEntregaEstimada || 'Por confirmar'}`);

    return NextResponse.json(result.pedido);
  } catch (error: any) {
    console.error('Error procesando inspección:', error);
    return NextResponse.json({ error: error.message || 'Error en la inspección' }, { status: 500 });
  }
}
