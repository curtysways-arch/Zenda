import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getAuthNegocioId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as any;
  return user.negocioId || user.businessId || null;
}

export async function GET() {
  try {
    const negocioId = await getAuthNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocio = await prisma.negocio.findUnique({ where: { id: negocioId } });
    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

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

    return NextResponse.json({ success: true, config: mesaConfig });
  } catch (error: any) {
    console.error('[ADMIN_MESAS_CONFIG_GET_ERROR]', error);
    return NextResponse.json({ error: 'Error al consultar configuración' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const negocioId = await getAuthNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocio = await prisma.negocio.findUnique({ where: { id: negocioId } });
    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const body = await request.json();

    let currentConfig: any = {};
    if (typeof negocio.configuracion === 'string') {
      try { currentConfig = JSON.parse(negocio.configuracion); } catch { currentConfig = {}; }
    } else {
      currentConfig = negocio.configuracion || {};
    }

    const updatedConfig = {
      ...currentConfig,
      ...(body.mesaPedidosHabilitados !== undefined && { mesaPedidosHabilitados: Boolean(body.mesaPedidosHabilitados) }),
      ...(body.mesaRadioPermitido !== undefined && { mesaRadioPermitido: Number(body.mesaRadioPermitido) }),
      ...(body.mesaLlamarMeseroHabilitado !== undefined && { mesaLlamarMeseroHabilitado: Boolean(body.mesaLlamarMeseroHabilitado) }),
      ...(body.mesaCooldownLlamada !== undefined && { mesaCooldownLlamada: Number(body.mesaCooldownLlamada) }),
      ...(body.latitudNegocio !== undefined && { latitudNegocio: Number(body.latitudNegocio) }),
      ...(body.longitudNegocio !== undefined && { longitudNegocio: Number(body.longitudNegocio) })
    };

    await prisma.negocio.update({
      where: { id: negocioId },
      data: {
        configuracion: updatedConfig
      }
    });

    return NextResponse.json({ success: true, config: updatedConfig });
  } catch (error: any) {
    console.error('[ADMIN_MESAS_CONFIG_POST_ERROR]', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
