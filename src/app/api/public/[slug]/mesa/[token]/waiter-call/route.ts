import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  try {
    const { slug, token } = await params;
    const body = await request.json().catch(() => ({}));
    const { tableSessionId, notas } = body;

    const negocio = await prisma.negocio.findUnique({ where: { slug } });
    if (!negocio || negocio.estado !== 'ACTIVO') {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    const mesa = await (prisma as any).restaurantTable.findFirst({
      where: { token, negocioId: negocio.id }
    });

    if (!mesa || !mesa.activa) {
      return NextResponse.json({ error: 'Mesa no disponible' }, { status: 403 });
    }

    // Configuración de cooldown
    let config: any = {};
    if (typeof negocio.configuracion === 'string') {
      try { config = JSON.parse(negocio.configuracion); } catch { config = {}; }
    } else {
      config = negocio.configuracion || {};
    }

    const mesaLlamarMeseroHabilitado = config.mesaLlamarMeseroHabilitado !== undefined ? Boolean(config.mesaLlamarMeseroHabilitado) : true;
    const mesaCooldownLlamada = config.mesaCooldownLlamada !== undefined ? Number(config.mesaCooldownLlamada) : 120; // Segundos

    if (!mesaLlamarMeseroHabilitado) {
      return NextResponse.json({ error: 'La opción de llamar al mesero no está disponible' }, { status: 403 });
    }

    const effectiveSessionId = tableSessionId || `session_${mesa.id}`;

    // 🔒 Validación Server-Side de Cooldown Anti-Spam
    const lastCall = await (prisma as any).waiterCall.findFirst({
      where: {
        negocioId: negocio.id,
        tableId: mesa.id,
        tableSessionId: effectiveSessionId,
        estado: { in: ['PENDING', 'ACKNOWLEDGED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (lastCall) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(lastCall.createdAt).getTime()) / 1000);
      if (elapsedSeconds < mesaCooldownLlamada) {
        const remainingSeconds = mesaCooldownLlamada - elapsedSeconds;
        return NextResponse.json({
          error: `Ya has solicitado atención. Podrás volver a solicitar mesero en ${remainingSeconds} segundos.`,
          cooldownRemaining: remainingSeconds
        }, { status: 429 });
      }
    }

    // Crear llamada de mesero
    const waiterCall = await (prisma as any).waiterCall.create({
      data: {
        negocioId: negocio.id,
        tableId: mesa.id,
        tableSessionId: effectiveSessionId,
        estado: 'PENDING',
        notas: notas ? String(notas).trim() : 'Solicitud de atención en mesa'
      }
    });

    // Actualizar estado de mesa a ATENCION_REQUERIDA si estaba disponible
    await (prisma as any).restaurantTable.update({
      where: { id: mesa.id },
      data: { estado: 'ATENCION_REQUERIDA' }
    });

    return NextResponse.json({
      success: true,
      message: 'Notificación enviada al mesero',
      waiterCall
    }, { status: 201 });
  } catch (error: any) {
    console.error('[PUBLIC_WAITER_CALL_POST_ERROR]', error);
    return NextResponse.json({ error: 'Error al enviar llamada al mesero' }, { status: 500 });
  }
}
