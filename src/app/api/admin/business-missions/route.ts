import { NextResponse } from 'next/server';
import { BusinessMissionService } from '@/lib/growth/businessMissionService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/business-missions
 * Lista las misiones instaladas por el negocio autenticado.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;

    const missions = await BusinessMissionService.getByNegocio(
      user.negocioId,
      status ?? undefined
    );

    return NextResponse.json({ success: true, missions });
  } catch (err: any) {
    console.error('[API Admin BusinessMissions GET]', err.message);
    return NextResponse.json({ error: 'Error al obtener misiones instaladas' }, { status: 500 });
  }
}
