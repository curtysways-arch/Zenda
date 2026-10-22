import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { getCommerceAccess } from '@/lib/business/commerceAccess';
import {
    listTeam,
    inviteDriver,
    inviteRecommended,
    resendInvite,
    decide,
    lookup,
    recommendations,
    HttpError,
} from '@/lib/logistics/driverNetwork';

export const dynamic = 'force-dynamic';

async function ctx() {
    const session = await getEffectiveAdminSession();
    const user = session?.user as any;
    if (!user?.negocioId) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
    const role = String(user.role || '').toUpperCase();
    if (role === 'STAFF' || role === 'PROFESIONAL') {
        return { error: NextResponse.json({ error: 'Solo el dueño o un administrador puede gestionar repartidores.' }, { status: 403 }) };
    }
    // Repartidores solo para negocios con envío a domicilio: por su tipo (restaurante, tienda,
    // lavandería…) o porque activaron el add-on "Venta de productos" (spa, barbería, etc.)
    const negocio = await prisma.negocio.findUnique({ where: { id: user.negocioId }, select: { id: true, tipoNegocio: true, configuracion: true } });
    const access = negocio ? await getCommerceAccess(negocio as any) : { delivery: false, orders: false };
    if (!access.delivery) {
        return {
            error: NextResponse.json(
                {
                    error: 'Tu negocio aún no tiene envíos a domicilio. Activa el add-on "Venta de productos" para vender online y tener repartidores.',
                    code: 'DELIVERY_NOT_ENABLED',
                    ventas: access.orders,
                },
                { status: 403 }
            ),
        };
    }
    return { negocioId: user.negocioId as string };
}

function fail(err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message, ...(err.extra || {}) }, { status: err.status });
    console.error('[admin/repartidores]', err);
    return NextResponse.json({ error: 'No se pudo completar la acción.' }, { status: 500 });
}

/**
 * GET                          → equipo del negocio + recomendados de la red
 * GET ?telefono=0991234567     → ¿ese número ya está en la red?
 */
export async function GET(req: NextRequest) {
    const c = await ctx();
    if ('error' in c) return c.error;
    try {
        const telefono = new URL(req.url).searchParams.get('telefono');
        if (telefono) return NextResponse.json(await lookup(c.negocioId, telefono));

        const [equipo, recomendados] = await Promise.all([listTeam(c.negocioId), recommendations(c.negocioId)]);
        return NextResponse.json({ equipo, recomendados });
    } catch (err) {
        return fail(err);
    }
}

/**
 * POST { action: 'invite', nombre, telefono, tipoVehiculo }
 * POST { action: 'invite_recommended', candidateId }
 * POST { action: 'resend', resourceId }
 * POST { action: 'approve' | 'reject' | 'pause' | 'resume' | 'remove', resourceId, motivo? }
 */
export async function POST(req: NextRequest) {
    const c = await ctx();
    if ('error' in c) return c.error;
    try {
        const body = await req.json().catch(() => ({}));
        const action = String(body.action || '');

        if (action === 'invite') {
            return NextResponse.json(await inviteDriver(c.negocioId, {
                nombre: String(body.nombre || '').slice(0, 80),
                telefono: String(body.telefono || '').slice(0, 20),
                tipoVehiculo: String(body.tipoVehiculo || 'MOTO'),
            }));
        }
        if (action === 'invite_recommended') {
            return NextResponse.json(await inviteRecommended(c.negocioId, String(body.candidateId || '')));
        }
        if (!body.resourceId) return NextResponse.json({ error: 'Falta el repartidor.' }, { status: 400 });
        if (action === 'resend') {
            return NextResponse.json(await resendInvite(c.negocioId, String(body.resourceId)));
        }
        if (['approve', 'reject', 'pause', 'resume', 'remove'].includes(action)) {
            return NextResponse.json(await decide(c.negocioId, String(body.resourceId), action as any, body.motivo ? String(body.motivo).slice(0, 300) : undefined));
        }
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (err) {
        return fail(err);
    }
}
