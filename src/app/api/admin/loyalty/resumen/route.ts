import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { RewardService } from '@/lib/loyalty/rewardService';
import { ClubResolver } from '@/lib/growth/clubResolver';

/**
 * Resumen del club para el dueño: lo que tiene que entregar hoy, cómo va el club
 * y qué clientes están a punto de ganar un premio (para invitarlos a volver).
 */

const PENDIENTES = ['PENDIENTE_ENTREGA', 'SOLICITADO', 'LISTO_PARA_RETIRAR'] as const;

async function negocioFromSession() {
    const session = await getEffectiveAdminSession();
    const user = session?.user as any;
    if (!user || user.isDelegatedExpired) return { error: NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 }) };
    if (!user.negocioId) return { error: NextResponse.json({ error: 'Tu usuario no tiene un negocio asignado.' }, { status: 403 }) };
    return { negocioId: user.negocioId as string, userId: user.id as string };
}

export async function GET() {
    const ctx = await negocioFromSession();
    if ('error' in ctx) return ctx.error;
    const { negocioId } = ctx;

    try {
        const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [negocio, redenciones, referidos, socios, movimientos, canjes30, resolved] = await Promise.all([
            prisma.negocio.findUnique({ where: { id: negocioId }, select: { nombre: true, slug: true } }),
            prisma.loyaltyRedemption.findMany({
                where: { negocioId, estado: { in: [...PENDIENTES] as any } },
                include: { Reward: { select: { nombre: true, tipo: true, deliveryType: true } }, Usuario: { select: { nombre: true, phone: true } } },
                orderBy: { createdAt: 'asc' },
                take: 50,
            }),
            prisma.referralReward.findMany({
                where: { negocioId, estado: { in: [...PENDIENTES] as any } },
                include: { Campaign: { select: { nombre: true, rewardType: true } }, Usuario: { select: { nombre: true, phone: true } } },
                orderBy: { createdAt: 'asc' },
                take: 50,
            }),
            prisma.userPoints.findMany({
                where: { negocioId },
                include: { Usuario: { select: { nombre: true, phone: true } }, NivelActual: { select: { nombre: true, color: true } } },
                orderBy: { puntos: 'desc' },
                take: 300,
            }),
            prisma.pointsHistory.findMany({
                where: { negocioId, createdAt: { gte: hace30 } },
                select: { userId: true, puntos: true, concepto: true },
            }),
            prisma.loyaltyRedemption.count({ where: { negocioId, createdAt: { gte: hace30 } } }),
            ClubResolver.resolveRewards(negocioId).catch(() => [] as any[]),
        ]);

        // Solo cuentan los premios manuales o los que el cliente ya pidió (los cupones se usan solos)
        const porEntregar = [
            ...redenciones
                .filter((r) => r.estado !== 'PENDIENTE_ENTREGA' || r.Reward?.deliveryType === 'MANUAL' || ['PERSONALIZADO', 'REGALO', 'REGALO_FISICO', 'PRODUCTO'].includes(String(r.Reward?.tipo)))
                .map((r) => ({
                    id: r.id,
                    tipoOrigen: 'PUNTOS' as const,
                    premio: r.Reward?.nombre || 'Premio',
                    cliente: r.Usuario?.nombre || 'Cliente',
                    telefono: r.Usuario?.phone || null,
                    estado: r.estado,
                    codigo: r.claimCode,
                    fecha: r.fechaSolicitud || r.createdAt,
                })),
            ...referidos.map((r) => ({
                id: r.id,
                tipoOrigen: 'REFERIDO' as const,
                premio: r.Campaign?.nombre || 'Premio por invitar',
                cliente: r.Usuario?.nombre || 'Cliente',
                telefono: r.Usuario?.phone || null,
                estado: r.estado,
                codigo: r.claimCode,
                fecha: r.fechaSolicitud || r.createdAt,
            })),
        ].sort((a, b) => {
            const rank = (e: string) => (e === 'SOLICITADO' ? 0 : e === 'LISTO_PARA_RETIRAR' ? 1 : 2);
            return rank(a.estado) - rank(b.estado) || new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        });

        // Premios del catálogo con costo, para saber quién está cerca
        const catalogo = (resolved as any[])
            .map((r) => (r.source === 'LOCAL'
                ? { nombre: r.data.nombre, costo: Number(r.data.costoPuntos || 0), activa: r.data.activa !== false }
                : { nombre: r.data.nombre, costo: Number(r.data.config?.costoPuntos || 0), activa: r.data.activo !== false }))
            .filter((r) => r.activa && r.costo > 0)
            .sort((a, b) => a.costo - b.costo);

        const cerca = socios
            .map((s) => {
                const puntos = Number(s.puntos || 0);
                const alcanza = catalogo.filter((c) => c.costo <= puntos);
                const siguiente = catalogo.find((c) => c.costo > puntos) || null;
                const falta = siguiente ? siguiente.costo - puntos : null;
                return {
                    userId: s.userId,
                    nombre: s.Usuario?.nombre && s.Usuario.nombre !== 'Cliente' ? s.Usuario.nombre : null,
                    telefono: s.Usuario?.phone || null,
                    puntos,
                    nivel: s.NivelActual?.nombre || null,
                    nivelColor: s.NivelActual?.color || null,
                    puedeCanjear: alcanza.length > 0 ? alcanza[alcanza.length - 1].nombre : null,
                    siguiente: siguiente?.nombre || null,
                    falta,
                    pctSiguiente: siguiente ? Math.round((puntos / siguiente.costo) * 100) : 100,
                };
            })
            .filter((c) => c.puedeCanjear || (c.falta !== null && c.pctSiguiente >= 60))
            .sort((a, b) => (b.puedeCanjear ? 1 : 0) - (a.puedeCanjear ? 1 : 0) || b.pctSiguiente - a.pctSiguiente)
            .slice(0, 8);

        const ganados = movimientos.filter((m) => m.puntos > 0);
        const kpis = {
            socios: socios.length,
            activos30: new Set(ganados.map((m) => m.userId)).size,
            puntos30: ganados.reduce((t, m) => t + m.puntos, 0),
            canjes30,
            porEntregar: porEntregar.length,
        };

        return NextResponse.json({ negocio: negocio?.nombre || '', slug: negocio?.slug || '', kpis, porEntregar, cerca, premios: catalogo.length });
    } catch (e: any) {
        console.error('[club/resumen]', e);
        return NextResponse.json({ error: 'No se pudo cargar el resumen del club.' }, { status: 500 });
    }
}

/** Entregar un premio desde el panel o buscar un premio por el código que dicta el cliente. */
export async function POST(req: Request) {
    const ctx = await negocioFromSession();
    if ('error' in ctx) return ctx.error;
    const { negocioId, userId } = ctx;

    const body = await req.json().catch(() => ({}));

    if (body.action === 'BUSCAR') {
        const code = String(body.codigo || '').trim().toUpperCase();
        if (!code) return NextResponse.json({ error: 'Escribe el código del cliente.' }, { status: 400 });
        const found = await RewardService.findByClaimCode(negocioId, code);
        if (!found) return NextResponse.json({ error: 'No encontramos un premio con ese código en tu negocio.' }, { status: 404 });
        return NextResponse.json({
            id: found.id,
            tipoOrigen: found.tipoOrigen,
            premio: found.nombre,
            cliente: found.clienteNombre,
            telefono: found.clienteTelefono,
            estado: found.estado,
            codigo: found.claimCode,
        });
    }

    if (body.action === 'ENTREGAR') {
        const id = String(body.id || '');
        const tipo = body.tipoOrigen === 'REFERIDO' ? 'REFERIDO' : 'PUNTOS';
        const actual: any = tipo === 'PUNTOS'
            ? await prisma.loyaltyRedemption.findUnique({ where: { id } })
            : await prisma.referralReward.findUnique({ where: { id } });
        if (!actual || actual.negocioId !== negocioId) {
            return NextResponse.json({ error: 'Premio no encontrado.' }, { status: 404 });
        }
        if (!(PENDIENTES as readonly string[]).includes(actual.estado)) {
            return NextResponse.json({ error: actual.estado === 'ENTREGADO' ? 'Este premio ya fue entregado.' : 'Este premio no está pendiente de entrega.' }, { status: 400 });
        }
        await RewardService.createAudit(id, tipo, 'DELIVERED', {
            negocioId,
            claimCode: actual.claimCode,
            oldStatus: actual.estado,
            newStatus: 'ENTREGADO',
            employeeId: userId,
            ip: req.headers.get('x-forwarded-for') || '',
            userAgent: req.headers.get('user-agent') || '',
        }).catch(() => {});
        await RewardService.updateStatus(id, tipo, 'ENTREGADO', userId);
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
}
