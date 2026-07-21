import { NextResponse } from 'next/server';
import { MissionDefinitionService } from '@/lib/growth/missionDefinitionService';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/superadmin/mission-definitions/[id]/rewards
 * Lista las recompensas Citiox de esta definición.
 */
export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const rewards = await MissionDefinitionService.getRewards(id);
    return NextResponse.json({ success: true, rewards });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/mission-definitions/[id]/rewards
 * Agrega una recompensa del RewardCatalog a esta definición.
 * Body: { rewardCatalogId: string, orden?: number }
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rewardCatalogId, orden } = body;

    if (!rewardCatalogId) {
      return NextResponse.json({ error: 'rewardCatalogId es requerido' }, { status: 400 });
    }

    const reward = await MissionDefinitionService.addReward(id, rewardCatalogId, orden);
    return NextResponse.json({ success: true, reward }, { status: 201 });
  } catch (err: any) {
    console.error('[API Superadmin MissionRewards POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

/**
 * DELETE /api/superadmin/mission-definitions/[id]/rewards
 * Elimina una recompensa de la definición.
 * Body: { rewardCatalogId: string }
 */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rewardCatalogId } = body;

    if (!rewardCatalogId) {
      return NextResponse.json({ error: 'rewardCatalogId es requerido' }, { status: 400 });
    }

    await MissionDefinitionService.removeReward(id, rewardCatalogId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
