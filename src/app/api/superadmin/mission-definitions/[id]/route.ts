import { NextResponse } from 'next/server';
import { MissionDefinitionService } from '@/lib/growth/missionDefinitionService';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/superadmin/mission-definitions/[id]
 */
export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const mission = await MissionDefinitionService.getById(id);
    return NextResponse.json({ success: true, mission });
  } catch (err: any) {
    return NextResponse.json({ error: 'Misión no encontrada' }, { status: 404 });
  }
}

/**
 * PATCH /api/superadmin/mission-definitions/[id]
 * Actualiza campos de la definición.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await MissionDefinitionService.update(id, body);
    return NextResponse.json({ success: true, mission: updated });
  } catch (err: any) {
    console.error('[API Superadmin MissionDefinition PATCH]', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

/**
 * DELETE /api/superadmin/mission-definitions/[id]
 * Elimina una misión solo si está en DRAFT y sin instalaciones.
 */
export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    await MissionDefinitionService.delete(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Superadmin MissionDefinition DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
