import { NextResponse } from 'next/server';
import { ServiceEngine } from '@/core/services/ServiceEngine';
import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';

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

    // Obtener teléfono del cliente desde el pedido
    const pedido = result.pedido as any;
    const extra = (pedido.extraInfo as any) || {};
    const telefonoCliente: string | undefined =
      pedido.telefonoCliente || extra.telefono || extra.telefonoCliente;

    if (telefonoCliente) {
      const nivelLabel: Record<string, string> = {
        POCO: 'Poco sucio',
        MEDIO: 'Medianamente sucio',
        ALTO: 'Muy sucio',
        RESTAURACION: 'Restauración'
      };

      const addLines = (serviciosAdicionales || [])
        .map((s: { nombre: string; precio: number }) => `  • ${s.nombre}: +$${Number(s.precio).toFixed(2)}`)
        .join('\n');

      const entregaTexto = fechaHoraEntregaEstimada
        ? new Date(fechaHoraEntregaEstimada).toLocaleString('es-EC', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
          })
        : 'Por confirmar';

      const mensaje = [
        `✅ *Cotización lista — Orden #${pedido.numeroPedido || id.slice(-6).toUpperCase()}*`,
        ``,
        `Hola! Ya inspeccionamos tus zapatos y tenemos el precio final:`,
        ``,
        `👟 *Nivel:* ${nivelLabel[nivelSuciedad] || nivelSuciedad} — $${baseFinal.toFixed(2)}`,
        addLines ? `🔧 *Adicionales:*\n${addLines}` : null,
        ``,
        `💵 *Total: $${result.breakdown.total.toFixed(2)}*`,
        ``,
        `📅 *Entrega estimada:* ${entregaTexto}`,
        notasInspeccion ? `📝 *Notas:* ${notasInspeccion}` : null,
        ``,
        `Para confirmar o cancelar responde a este mensaje. ¡Gracias! 🙏`
      ].filter(Boolean).join('\n');

      await sendWhatsAppMessage(
        telefonoCliente.replace(/\D/g, ''),
        mensaje,
        'shoe_care_cotizacion'
      );
    } else {
      console.warn(`[inspect] Orden ${id} sin teléfono de cliente registrado — WhatsApp no enviado`);
    }

    return NextResponse.json(result.pedido);
  } catch (error: any) {
    console.error('Error procesando inspección:', error);
    return NextResponse.json({ error: error.message || 'Error en la inspección' }, { status: 500 });
  }
}
