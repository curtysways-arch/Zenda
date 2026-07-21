import { NextResponse } from 'next/server';
import { BusinessMissionService } from '@/lib/growth/businessMissionService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/business-missions/[id]/configure-reward
 * Configura la recompensa del negocio (premio local) para la misión instalada.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { rewardType, value, serviceId, productId, couponId, descripcion, ...extra } = body;

    if (!rewardType) {
      return NextResponse.json({ error: 'El tipo de recompensa (rewardType) es requerido' }, { status: 400 });
    }

    const updated = await BusinessMissionService.configureReward(id, {
      rewardType,
      value: value ? parseFloat(String(value)) : undefined,
      serviceId,
      productId,
      couponId,
      descripcion,
      ...extra
    });

    return NextResponse.json({ success: true, businessMission: updated });
  } catch (err: any) {
    console.error('[API Admin BusinessMission ConfigureReward]', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
