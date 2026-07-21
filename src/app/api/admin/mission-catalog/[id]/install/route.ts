import { NextResponse } from 'next/server';
import { BusinessMissionService } from '@/lib/growth/businessMissionService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/mission-catalog/[id]/install
 * Instala una MissionDefinition en el negocio del usuario autenticado.
 * Body: { rewardConfiguration?: object } (opcional, si se quiere configurar de inmediato)
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { rewardConfiguration } = body;

    const businessMission = await BusinessMissionService.install({
      missionDefinitionId: id,
      negocioId: user.negocioId,
      rewardConfiguration: rewardConfiguration ?? undefined,
    });

    return NextResponse.json({ success: true, businessMission }, { status: 201 });
  } catch (err: any) {
    console.error('[API Admin MissionCatalog Install]', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
