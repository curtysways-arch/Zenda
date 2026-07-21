import { NextResponse } from 'next/server';
import { BusinessMissionService } from '@/lib/growth/businessMissionService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/mission-catalog
 * Retorna las misiones publicadas disponibles para instalar en este negocio.
 * Excluye automáticamente las que ya instaló.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const catalog = await BusinessMissionService.getAvailableCatalog(user.negocioId);
    return NextResponse.json({ success: true, catalog });
  } catch (err: any) {
    console.error('[API Admin MissionCatalog GET]', err.message);
    return NextResponse.json({ error: 'Error al obtener catálogo' }, { status: 500 });
  }
}
