import { NextResponse } from 'next/server';
import { MissionDefinitionService } from '@/lib/growth/missionDefinitionService';
import { MissionCategory, MissionDefStatus } from '@prisma/client';

/**
 * GET /api/superadmin/mission-definitions
 * Lista todas las definiciones de misión con filtros opcionales.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as MissionDefStatus | null;
    const categoria = searchParams.get('categoria') as MissionCategory | null;

    const missions = await MissionDefinitionService.getAll({
      ...(status && { status }),
      ...(categoria && { categoria }),
    });

    return NextResponse.json({ success: true, missions });
  } catch (err: any) {
    console.error('[API Superadmin MissionDefinitions GET]', err.message);
    return NextResponse.json({ error: 'Error al obtener misiones' }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/mission-definitions
 * Crea una nueva definición de misión (en estado DRAFT).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      nombre,
      descripcion,
      imagenUrl,
      categoria,
      dificultad,
      triggerEvent,
      cantidadMeta,
      condicionesExtra,
      config,
      metadata,
      requiresBusinessReward,
      rewardIds,
    } = body;

    if (!nombre || !descripcion || !triggerEvent) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: nombre, descripcion, triggerEvent' },
        { status: 400 }
      );
    }

    const mission = await MissionDefinitionService.create({
      nombre,
      descripcion,
      imagenUrl,
      categoria,
      dificultad,
      triggerEvent,
      cantidadMeta: cantidadMeta ?? 1,
      condicionesExtra,
      config,
      metadata,
      requiresBusinessReward: !!requiresBusinessReward,
      rewardIds,
    });

    return NextResponse.json({ success: true, mission }, { status: 201 });
  } catch (err: any) {
    console.error('[API Superadmin MissionDefinitions POST]', err.message);
    return NextResponse.json({ error: 'Error al crear misión: ' + err.message }, { status: 500 });
  }
}
