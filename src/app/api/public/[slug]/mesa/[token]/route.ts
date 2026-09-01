import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  try {
    const { slug, token } = await params;

    const negocio = await prisma.negocio.findUnique({
      where: { slug }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    if (negocio.estado !== 'ACTIVO') {
      return NextResponse.json({ error: 'El restaurante no se encuentra activo actualmente' }, { status: 403 });
    }

    const mesa = await (prisma as any).restaurantTable.findFirst({
      where: {
        token,
        negocioId: negocio.id
      }
    });

    if (!mesa) {
      return NextResponse.json({ error: 'Mesa no encontrada o desvinculada' }, { status: 404 });
    }

    if (!mesa.activa) {
      return NextResponse.json({ error: 'Esta mesa no se encuentra disponible actualmente' }, { status: 403 });
    }

    // Configuración de mesa
    let config: any = {};
    if (typeof negocio.configuracion === 'string') {
      try { config = JSON.parse(negocio.configuracion); } catch { config = {}; }
    } else {
      config = negocio.configuracion || {};
    }

    const mesaConfig = {
      mesaPedidosHabilitados: config.mesaPedidosHabilitados !== undefined ? Boolean(config.mesaPedidosHabilitados) : true,
      mesaRadioPermitido: config.mesaRadioPermitido !== undefined ? Number(config.mesaRadioPermitido) : 100,
      mesaLlamarMeseroHabilitado: config.mesaLlamarMeseroHabilitado !== undefined ? Boolean(config.mesaLlamarMeseroHabilitado) : true,
      mesaCooldownLlamada: config.mesaCooldownLlamada !== undefined ? Number(config.mesaCooldownLlamada) : 120,
      latitudNegocio: config.latitudNegocio !== undefined ? Number(config.latitudNegocio) : -0.180653,
      longitudNegocio: config.longitudNegocio !== undefined ? Number(config.longitudNegocio) : -78.467838
    };

    return NextResponse.json({
      success: true,
      negocio: {
        id: negocio.id,
        nombre: negocio.nombre,
        slug: negocio.slug,
        logoUrl: negocio.logoUrl,
        whatsapp: negocio.whatsapp,
        colorPrimario: negocio.colorPrimario
      },
      mesa: {
        id: mesa.id,
        nombre: mesa.nombre,
        numero: mesa.numero,
        token: mesa.token,
        permitePedidos: mesa.permitePedidos && mesaConfig.mesaPedidosHabilitados,
        estado: mesa.estado
      },
      config: mesaConfig
    });
  } catch (error: any) {
    console.error('[PUBLIC_MESA_GET_ERROR]', error);
    return NextResponse.json({ error: 'Error al consultar mesa' }, { status: 500 });
  }
}
