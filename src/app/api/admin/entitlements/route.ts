import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EntitlementsService } from '@/core/entitlements/EntitlementsService';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetBizId = searchParams.get('businessId') || (session.user as any).negocioId;

    if (!targetBizId) {
      return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });
    }

    const entitlements = await EntitlementsService.resolve(targetBizId);
    return NextResponse.json({ success: true, entitlements });
  } catch (error: any) {
    console.error('[API_ADMIN_ENTITLEMENTS_GET_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error al resolver entitlements' }, { status: 500 });
  }
}
