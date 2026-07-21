import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RewardCatalogType } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const rewards = await prisma.rewardCatalog.findMany({
      where: { activa: true, activo: true },
      orderBy: { nombre: 'asc' }
    });
    return NextResponse.json({ success: true, rewards });
  } catch (error: any) {
    console.error('[API Superadmin Rewards GET] Error:', error.message);
    return NextResponse.json({ error: 'Error al obtener catálogo de recompensas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, tipo, handler, config } = body;

    if (!nombre || !tipo) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: nombre y tipo' }, { status: 400 });
    }

    const reward = await prisma.rewardCatalog.create({
      data: {
        nombre,
        descripcion: descripcion || null,
        tipo: tipo as RewardCatalogType,
        handler: handler || 'wallet',
        config: config || {},
        activo: true,
        activa: true
      }
    });

    return NextResponse.json({ success: true, reward }, { status: 201 });
  } catch (error: any) {
    console.error('[API Superadmin Rewards POST] Error:', error.message);
    return NextResponse.json({ error: 'Error al crear recompensa en el catálogo: ' + error.message }, { status: 500 });
  }
}

