import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import {
    LandingFamily,
    designsForFamily,
    getLandingDesign,
    readLandingState,
    canUseDesign,
    withLandingState,
} from '@/lib/landingDesigns';

export const dynamic = 'force-dynamic';

async function loadContext() {
    const session = await getEffectiveAdminSession();
    const user = session?.user as any;
    if (!user?.id) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
    const role = String(user.role || '').toUpperCase();
    if (role === 'STAFF' || role === 'PROFESIONAL') {
        return { error: NextResponse.json({ error: 'Solo el dueño puede cambiar el diseño de la página.' }, { status: 403 }) };
    }
    const negocioId = user.negocioId as string | undefined;
    if (!negocioId) return { error: NextResponse.json({ error: 'Negocio no configurado' }, { status: 400 }) };
    const negocio = await prisma.negocio.findUnique({
        where: { id: negocioId },
        select: { id: true, nombre: true, slug: true, tipoNegocio: true, configuracion: true, isDemo: true },
    });
    if (!negocio) return { error: NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 }) };
    return { negocio };
}

async function familyFor(negocio: any): Promise<LandingFamily | null> {
    const h: any = await import('@/lib/businessTypeHelper');
    const cfg = typeof negocio.configuracion === 'string' ? (() => { try { return JSON.parse(negocio.configuracion); } catch { return {}; } })() : (negocio.configuracion || {});
    const n = { ...negocio, configuracion: h.normalizeBusinessConfig ? h.normalizeBusinessConfig(cfg) : cfg };
    try {
        if (String(negocio.tipoNegocio || '').toUpperCase() === 'PRODUCTOS') return null;
        if (h.isDentalBusiness?.(n)) return 'dental';
        if (h.isGymBusiness?.(n) || h.isStoreBusiness?.(n) || h.isSportsCourtsBusiness?.(n) || h.isRestaurantBusiness?.(n) || h.isLaundryOrShoeCareBusiness?.(n)) return null;
    } catch { /* tratar como servicios */ }
    return 'servicios';
}

/** GET: diseños disponibles para el negocio, cuál está activo y cuáles ya tiene. */
export async function GET() {
    try {
        const ctx = await loadContext();
        if ('error' in ctx) return ctx.error;
        const { negocio } = ctx;
        const family = await familyFor(negocio);
        const state = readLandingState(negocio.configuracion);

        const pendientes = await prisma.payment.findMany({
            where: { negocio_id: negocio.id, estado_pago: 'pending', plan_id: { startsWith: 'LANDING:' } },
            select: { plan_id: true },
        });
        const pendingIds = new Set(pendientes.map((p) => p.plan_id.replace('LANDING:', '')));

        const designs = family ? designsForFamily(family) : [];
        return NextResponse.json({
            slug: negocio.slug,
            isDemo: Boolean(negocio.isDemo),
            disponible: Boolean(family),
            activo: state.activo,
            designs: designs.map((d) => ({
                ...d,
                activo: d.id === state.activo,
                puedeUsar: canUseDesign(d, state, Boolean(negocio.isDemo)),
                comprado: state.comprados.includes(d.id),
                pendiente: pendingIds.has(d.id),
            })),
        });
    } catch (err: any) {
        console.error('[landing-designs GET]', err);
        return NextResponse.json({ error: 'No se pudieron cargar los diseños' }, { status: 500 });
    }
}

/**
 * POST { action: 'activar', id }                       → usar un diseño gratis o ya comprado
 * POST { action: 'comprar', id, metodoPago, referencia } → solicitud de compra (la aprueba el superadmin)
 */
export async function POST(req: Request) {
    try {
        const ctx = await loadContext();
        if ('error' in ctx) return ctx.error;
        const { negocio } = ctx;
        const body = await req.json().catch(() => ({}));
        const design = getLandingDesign(body?.id);
        if (!design) return NextResponse.json({ error: 'Diseño no encontrado' }, { status: 404 });

        const family = await familyFor(negocio);
        if (!family || !design.familias.includes(family)) {
            return NextResponse.json({ error: 'Este diseño no está disponible para tu tipo de negocio.' }, { status: 400 });
        }

        const state = readLandingState(negocio.configuracion);

        if (body.action === 'activar') {
            if (!canUseDesign(design, state, Boolean(negocio.isDemo))) {
                return NextResponse.json({ error: 'Primero debes comprar este diseño.' }, { status: 402 });
            }
            const next = withLandingState(negocio.configuracion, { activo: design.id, comprados: state.comprados });
            await prisma.negocio.update({ where: { id: negocio.id }, data: { configuracion: next as any } });
            return NextResponse.json({ success: true, activo: design.id });
        }

        if (body.action === 'comprar') {
            if (canUseDesign(design, state, Boolean(negocio.isDemo))) {
                return NextResponse.json({ error: 'Ya puedes usar este diseño, no necesitas comprarlo.' }, { status: 400 });
            }
            const existing = await prisma.payment.findFirst({
                where: { negocio_id: negocio.id, plan_id: `LANDING:${design.id}`, estado_pago: 'pending' },
            });
            if (existing) {
                return NextResponse.json({ success: true, pendiente: true, message: 'Tu solicitud ya está en revisión.' });
            }
            const metodoPago = String(body.metodoPago || 'TRANSFERENCIA').slice(0, 40);
            const referencia = body.referencia ? String(body.referencia).slice(0, 120) : `DISENO_${design.id.toUpperCase()}_${Date.now()}`;
            await prisma.payment.create({
                data: {
                    id: crypto.randomUUID(),
                    negocio_id: negocio.id,
                    plan_id: `LANDING:${design.id}`,
                    monto: design.precio,
                    metodo_pago: metodoPago,
                    referencia,
                    comprobante: body.comprobante ? String(body.comprobante) : null,
                    estado_pago: 'pending',
                },
            });
            try {
                const { notifyAdminAddonEvent } = await import('@/lib/adminNotificationHelper');
                await notifyAdminAddonEvent({
                    eventType: 'SOLICITADO',
                    businessName: negocio.nombre,
                    addonName: `Diseño de página ${design.nombre}`,
                    addonCode: `LANDING_${design.id.toUpperCase()}`,
                    quantity: 1,
                    amount: design.precio,
                    paymentMethod: metodoPago,
                    reference: referencia,
                } as any);
            } catch { /* la notificación no es crítica */ }
            return NextResponse.json({ success: true, pendiente: true });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (err: any) {
        console.error('[landing-designs POST]', err);
        return NextResponse.json({ error: 'No se pudo completar la acción' }, { status: 500 });
    }
}
