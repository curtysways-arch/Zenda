import { NextResponse } from 'next/server';
import { MissionDefinitionService } from '@/lib/growth/missionDefinitionService';

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * GET /api/superadmin/mission-definitions/[id]
 */
export async function GET(_: Request, { params }: Params) {
  try {
    const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
    }

    const mission = await MissionDefinitionService.getById(id);
    return NextResponse.json({ success: true, mission });
  } catch (err: any) {
    return NextResponse.json({ error: 'Misión no encontrada' }, { status: 404 });
  }
}

/**
 * PUT /api/superadmin/mission-definitions/[id]
 * Actualiza campos de la definición.
 */
export async function PUT(request: Request, { params }: Params) {
  try {
    const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
    }

    const body = await request.json();
    const updated = await MissionDefinitionService.update(id, body);
    return NextResponse.json({ success: true, mission: updated });
  } catch (err: any) {
    console.error('[API Superadmin MissionDefinition PUT]', err.message);
    return NextResponse.json({ error: err.message || 'Error al actualizar misión' }, { status: 400 });
  }
}

/**
 * PATCH /api/superadmin/mission-definitions/[id]
 * Actualiza campos de la definición.
 */
export async function PATCH(request: Request, context: Params) {
  return PUT(request, context);
}

/**
 * DELETE /api/superadmin/mission-definitions/[id]
 * Elimina una misión solo si está en DRAFT y sin instalaciones.
 */
export async function DELETE(_: Request, { params }: Params) {
  try {
    const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
    }

    await MissionDefinitionService.delete(id);
    return NextResponse.json({ success: true, message: 'Misión eliminada correctamente' });
  } catch (err: any) {
    console.error('[API Superadmin MissionDefinition DELETE]', err.message);
    return NextResponse.json({ error: err.message || 'Error al eliminar misión' }, { status: 400 });
  }
}

