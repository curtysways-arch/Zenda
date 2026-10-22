import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { inviteDriver, HttpError } from '@/lib/logistics/driverNetwork';

export const dynamic = 'force-dynamic';

/** Negocio de la sesión. Solo el superadmin puede consultar otro negocio. */
async function resolveNegocio(req: Request, bodyNegocioId?: string) {
  const session = await getEffectiveAdminSession();
  const user = session?.user as any;
  if (!user) return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  const isSuper = user.role === 'SUPERADMIN' || user.role === 'SUPER_ADMIN' || user.isAdminUser === true;
  const { searchParams } = new URL(req.url);
  const requested = bodyNegocioId || searchParams.get('businessId') || searchParams.get('negocioId');
  const negocioId = isSuper && requested ? requested : user.negocioId;
  if (!negocioId) return { error: NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 }) };
  return { negocioId: negocioId as string };
}

export async function GET(req: Request) {
  try {
    const c = await resolveNegocio(req);
    if ('error' in c) return c.error;
    const includeInactive = new URL(req.url).searchParams.get('includeInactive') === 'true';

    const resources = await (prisma as any).operableResource.findMany({
      where: {
        negocioId: c.negocioId,
        category: 'DELIVERY_DRIVER',
        ...(includeInactive ? {} : { active: true }),
      },
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
    });
    const visible = resources.filter((r: any) => !(r.metadata && (r.metadata as any).removedAt));
    return NextResponse.json(visible);
  } catch (error: any) {
    console.error('[LOGISTICS/RESOURCES GET ERROR]', error);
    return NextResponse.json([]);
  }
}

/** Agregar repartidor = invitarlo (el registro y la aprobación siguen el flujo normal). */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const c = await resolveNegocio(req, body.negocioId || body.businessId);
    if ('error' in c) return c.error;
    const result = await inviteDriver(c.negocioId, {
      nombre: body.name || body.nombre,
      telefono: body.telefono || '',
      tipoVehiculo: body.tipoVehiculo,
    });
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: any) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[LOGISTICS/RESOURCES POST ERROR]', error);
    return NextResponse.json({ error: 'Error creando repartidor' }, { status: 500 });
  }
}
