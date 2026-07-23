import { NextResponse } from 'next/server';
import { MissionDefinitionService } from '@/lib/growth/missionDefinitionService';

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * POST /api/superadmin/mission-definitions/[id]/publish
 * Publica o archiva una definición de misión.
 * Body: { action: 'publish' | 'archive', ...publicationData }
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
    }

    const body = await request.json();
    const { action, globalSeasonId, fechaInicio, fechaFin, prioridad, segmentacion } = body;

    if (!action || !['publish', 'archive'].includes(action)) {
      return NextResponse.json(
        { error: "El campo 'action' debe ser 'publish' o 'archive'" },
        { status: 400 }
      );
    }

    if (action === 'publish') {
      const mission = await MissionDefinitionService.publish(id, {
        globalSeasonId,
        fechaInicio,
        fechaFin,
        prioridad: prioridad ?? 0,
        segmentacion,
      });
      return NextResponse.json({ success: true, mission });
    }

    if (action === 'archive') {
      const mission = await MissionDefinitionService.archive(id);
      return NextResponse.json({ success: true, mission });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err: any) {
    console.error('[API Superadmin MissionDefinition Publish]', err.message);
    return NextResponse.json({ error: err.message || 'Error en publicación' }, { status: 400 });
  }
}

