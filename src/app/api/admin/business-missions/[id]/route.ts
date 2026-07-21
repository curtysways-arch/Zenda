import { NextResponse } from 'next/server';
import { BusinessMissionService } from '@/lib/growth/businessMissionService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/business-missions/[id]
 * Cambia el estado de una BusinessMission (ACTIVE | PAUSED | ENDED).
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!['ACTIVE', 'PAUSED', 'ENDED'].includes(status)) {
      return NextResponse.json(
        { error: "El campo 'status' debe ser ACTIVE, PAUSED o ENDED" },
        { status: 400 }
      );
    }

    const updated = await BusinessMissionService.setStatus(id, status);
    return NextResponse.json({ success: true, mission: updated });
  } catch (err: any) {
    console.error('[API Admin BusinessMission PATCH]', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
