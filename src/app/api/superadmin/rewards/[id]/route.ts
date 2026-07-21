import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RewardCatalogType } from '@prisma/client';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion, tipo, handler, config, activo, activa } = body;

    const data: any = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (descripcion !== undefined) data.descripcion = descripcion;
    if (tipo !== undefined) data.tipo = tipo as RewardCatalogType;
    if (handler !== undefined) data.handler = handler;
    if (config !== undefined) data.config = config;
    if (activo !== undefined) data.activo = !!activo;
    if (activa !== undefined) data.activa = !!activa;

    const reward = await prisma.rewardCatalog.update({
      where: { id },
      data
    });

    return NextResponse.json({ success: true, reward });
  } catch (error: any) {
    console.error('[API Superadmin Rewards PUT] Error:', error.message);
    return NextResponse.json({ error: 'Error al actualizar recompensa' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reward = await prisma.rewardCatalog.update({
      where: { id },
      data: {
        activo: false,
        activa: false
      }
    });

    return NextResponse.json({ success: true, reward });
  } catch (error: any) {
    console.error('[API Superadmin Rewards DELETE] Error:', error.message);
    return NextResponse.json({ error: 'Error al desactivar recompensa' }, { status: 500 });
  }
}

