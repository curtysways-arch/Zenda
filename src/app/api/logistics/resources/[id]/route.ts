import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ─── PUT: Actualizar repartidor ───────────────────────────────────────────────
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const { id } = await params;
    const body = await req.json();

    // Verificar pertenencia al negocio
    const existing = await (prisma as any).operableResource.findFirst({
      where: { id, negocioId, category: 'DELIVERY_DRIVER' },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 });
    }

    const {
      nombre,
      avatar,
      active,
      estado,
      // Profile fields
      licencia,
      documento,
      telefono,
      fotografiaUrl,
      vehiculo,
      placa,
      tipoVehiculo,
      contactoEmergencia,
      observaciones,
    } = body;

    const updated = await (prisma as any).operableResource.update({
      where: { id },
      data: {
        ...(nombre !== undefined ? { name: nombre } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(estado !== undefined ? { estado } : {}),
        updatedAt: new Date(),
        profile: {
          upsert: {
            create: {
              licencia: licencia || null,
              documento: documento || null,
              telefono: telefono || null,
              fotografiaUrl: fotografiaUrl || null,
              vehiculo: vehiculo || null,
              placa: placa || null,
              tipoVehiculo: tipoVehiculo || null,
              contactoEmergencia: contactoEmergencia || null,
              observaciones: observaciones || null,
            },
            update: {
              ...(licencia !== undefined ? { licencia } : {}),
              ...(documento !== undefined ? { documento } : {}),
              ...(telefono !== undefined ? { telefono } : {}),
              ...(fotografiaUrl !== undefined ? { fotografiaUrl } : {}),
              ...(vehiculo !== undefined ? { vehiculo } : {}),
              ...(placa !== undefined ? { placa } : {}),
              ...(tipoVehiculo !== undefined ? { tipoVehiculo } : {}),
              ...(contactoEmergencia !== undefined ? { contactoEmergencia } : {}),
              ...(observaciones !== undefined ? { observaciones } : {}),
            },
          },
        },
      },
      include: { profile: true },
    });

    // Emitir evento de dominio
    if (estado) {
      console.log('[LOGISTICS_EVENT] DriverStatusChanged', { resourceId: id, estado, negocioId });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[LOGISTICS/RESOURCES/[id] PUT]', error);
    return NextResponse.json({ error: 'Error actualizando repartidor' }, { status: 500 });
  }
}

// ─── DELETE: Desactivar (soft delete) ────────────────────────────────────────
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const { id } = await params;

    const existing = await (prisma as any).operableResource.findFirst({
      where: { id, negocioId, category: 'DELIVERY_DRIVER' },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 });
    }

    // Soft delete: solo desactivar
    await (prisma as any).operableResource.update({
      where: { id },
      data: { active: false, estado: 'FUERA_DE_SERVICIO', updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[LOGISTICS/RESOURCES/[id] DELETE]', error);
    return NextResponse.json({ error: 'Error eliminando repartidor' }, { status: 500 });
  }
}
