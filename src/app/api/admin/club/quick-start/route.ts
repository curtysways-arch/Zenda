import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { CLUB_PRESETS, ClubPresetKey, pickPresetForBusiness } from '@/lib/loyalty/clubPresets';

export const dynamic = 'force-dynamic';

const CAMPAIGN_NAME = 'Club de beneficios';

async function getNegocioId() {
    const session = await getEffectiveAdminSession();
    const user = session?.user as any;
    if (!user?.id) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
    const role = String(user.role || '').toUpperCase();
    if (role === 'STAFF' || role === 'PROFESIONAL') {
        return { error: NextResponse.json({ error: 'Solo el dueño o un administrador puede configurar el club.' }, { status: 403 }) };
    }
    let negocioId = user.negocioId as string | undefined;
    if (!negocioId) {
        const u = await prisma.usuario.findUnique({ where: { id: user.id }, select: { negocioId: true } });
        negocioId = u?.negocioId || undefined;
    }
    if (!negocioId) return { error: NextResponse.json({ error: 'Negocio no configurado' }, { status: 400 }) };
    return { negocioId };
}

function parseConfig(raw: any): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return {}; }
    }
    return { ...raw };
}

async function clubStatus(negocioId: string) {
    const [negocio, levels, quests, rewards] = await Promise.all([
        prisma.negocio.findUnique({ where: { id: negocioId }, select: { id: true, nombre: true, tipoNegocio: true, configuracion: true } }),
        prisma.loyaltyLevel.findMany({ where: { negocioId }, orderBy: { orden: 'asc' } }),
        prisma.quest.findMany({ where: { negocioId }, select: { id: true, nombre: true, activa: true } }),
        prisma.loyaltyReward.findMany({ where: { negocioId }, select: { id: true, nombre: true, costoPuntos: true, activa: true } }),
    ]);
    const config = parseConfig(negocio?.configuracion);
    return { negocio, config, levels, quests, rewards };
}

/**
 * GET /api/admin/club/quick-start
 * Estado del club del negocio + plantilla recomendada (y todas las disponibles).
 */
export async function GET() {
    try {
        const auth = await getNegocioId();
        if ('error' in auth) return auth.error;
        const { negocio, config, levels, quests, rewards } = await clubStatus(auth.negocioId);

        const recommended = await pickPresetForBusiness({ ...negocio, configuracion: config });
        const activo = Boolean(config.clubPreset) || (quests.some((q) => q.activa) && rewards.length > 0);

        return NextResponse.json({
            activo,
            preset: config.clubPreset || null,
            recommended,
            reglas: {
                puntosActivos: config.puntosActivos !== false,
                puntosReserva: Number(config.puntosReserva ?? 10),
                puntosReferido: Number(config.puntosReferido ?? 50),
                puntosPorDolar: Number(config.puntosPorDolar ?? 1),
            },
            conteo: {
                niveles: levels.length,
                misiones: quests.filter((q) => q.activa).length,
                premios: rewards.filter((r) => r.activa).length,
            },
            niveles: levels.map((l) => ({ id: l.id, nombre: l.nombre, desde: l.diamantesRequeridos, multiplicador: l.multiplicador, color: l.color })),
            presets: Object.values(CLUB_PRESETS),
        });
    } catch (err: any) {
        console.error('[club/quick-start GET]', err);
        return NextResponse.json({ error: 'No se pudo cargar el club' }, { status: 500 });
    }
}

/**
 * POST /api/admin/club/quick-start   { preset?: ClubPresetKey }
 * Activa el club en un paso: reglas de puntos, 3 niveles, misiones y premios.
 * No borra nada: si el negocio ya tiene niveles, misiones o premios con el mismo nombre, se respetan.
 */
export async function POST(req: Request) {
    try {
        const auth = await getNegocioId();
        if ('error' in auth) return auth.error;
        const negocioId = auth.negocioId;

        const body = await req.json().catch(() => ({}));
        const { negocio, config, levels, quests, rewards } = await clubStatus(negocioId);
        const key = (body?.preset && body.preset in CLUB_PRESETS ? body.preset : await pickPresetForBusiness({ ...negocio, configuracion: config })) as ClubPresetKey;
        const preset = CLUB_PRESETS[key];

        const created = { niveles: 0, misiones: 0, premios: 0 };

        await prisma.$transaction(async (tx) => {
            // 1. Reglas de puntos
            const newConfig = {
                ...config,
                puntosActivos: true,
                puntosReserva: preset.puntosPorVisita,
                puntosReferido: preset.puntosReferido,
                puntosPorDolar: config.puntosPorDolar ?? preset.puntosPorDolar,
                clubPreset: key,
                clubActivadoEn: new Date().toISOString(),
            };
            await tx.negocio.update({
                where: { id: negocioId },
                data: { configuracion: typeof negocio?.configuracion === 'string' ? JSON.stringify(newConfig) : newConfig } as any,
            });

            // 2. Niveles (solo si el negocio todavía no tiene)
            if (levels.length === 0) {
                for (const [i, lvl] of preset.levels.entries()) {
                    await tx.loyaltyLevel.create({
                        data: {
                            negocioId,
                            nombre: lvl.nombre,
                            diamantesRequeridos: lvl.desde,
                            color: lvl.color,
                            icono: lvl.icono,
                            orden: i + 1,
                            beneficios: lvl.beneficios,
                            multiplicador: lvl.multiplicador,
                        } as any,
                    });
                    created.niveles++;
                }
            }

            // 3. Misiones
            let campaign = await tx.campaign.findFirst({ where: { negocioId, nombre: CAMPAIGN_NAME } });
            if (!campaign) {
                campaign = await tx.campaign.create({
                    data: { negocioId, nombre: CAMPAIGN_NAME, descripcion: `Misiones del club (${preset.nombre}).`, activa: true },
                });
            }
            const existingQuestNames = new Set(quests.map((q) => q.nombre.trim().toLowerCase()));
            for (const m of preset.missions) {
                if (existingQuestNames.has(m.nombre.trim().toLowerCase())) continue;
                await tx.quest.create({
                    data: {
                        negocioId,
                        campaignId: campaign.id,
                        nombre: m.nombre,
                        descripcion: m.descripcion,
                        icono: m.icono,
                        color: m.color,
                        visible: true,
                        repetible: Boolean(m.repetible),
                        limiteUsuario: m.limiteUsuario ?? 1,
                        triggerEvent: m.triggerEvent,
                        cantidadMeta: m.cantidadMeta,
                        validacionTipo: 'AUTOMATICO',
                        acciones: JSON.stringify([{ action: 'ADD_POINTS', value: m.puntos }]),
                        origen: 'PLANTILLA',
                        templateIdOrigen: `club:${key}`,
                        templateVersionOrigen: '1.0.0',
                        activa: true,
                    } as any,
                });
                created.misiones++;
            }

            // 4. Premios canjeables con puntos
            const existingRewardNames = new Set(rewards.map((r) => r.nombre.trim().toLowerCase()));
            for (const r of preset.rewards) {
                if (existingRewardNames.has(r.nombre.trim().toLowerCase())) continue;
                await tx.loyaltyReward.create({
                    data: {
                        negocioId,
                        nombre: r.nombre,
                        descripcion: r.descripcion,
                        costoPuntos: r.costoPuntos,
                        tipo: 'PERSONALIZADO',
                        deliveryType: 'MANUAL',
                        activa: true,
                    } as any,
                });
                created.premios++;
            }
        });

        return NextResponse.json({ success: true, preset: key, created });
    } catch (err: any) {
        console.error('[club/quick-start POST]', err);
        return NextResponse.json({ error: 'No se pudo activar el club. Intenta de nuevo.' }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/club/quick-start  { puntosReserva?, puntosReferido? }
 * Cambia las reglas básicas de puntos sin entrar a la configuración avanzada.
 */
export async function PATCH(req: Request) {
    try {
        const auth = await getNegocioId();
        if ('error' in auth) return auth.error;
        const body = await req.json().catch(() => ({}));
        const negocio = await prisma.negocio.findUnique({ where: { id: auth.negocioId }, select: { configuracion: true } });
        const config = parseConfig(negocio?.configuracion);
        const clamp = (v: any) => Math.max(0, Math.min(1000, Math.round(Number(v))));
        if (body.puntosReserva !== undefined && !isNaN(Number(body.puntosReserva))) config.puntosReserva = clamp(body.puntosReserva);
        if (body.puntosReferido !== undefined && !isNaN(Number(body.puntosReferido))) config.puntosReferido = clamp(body.puntosReferido);
        if (body.puntosPorDolar !== undefined && !isNaN(Number(body.puntosPorDolar))) config.puntosPorDolar = Math.max(0, Math.min(100, Number(body.puntosPorDolar)));
        if (body.puntosActivos !== undefined) config.puntosActivos = Boolean(body.puntosActivos);
        await prisma.negocio.update({
            where: { id: auth.negocioId },
            data: { configuracion: typeof negocio?.configuracion === 'string' ? JSON.stringify(config) : config } as any,
        });
        return NextResponse.json({ success: true, reglas: { puntosActivos: config.puntosActivos !== false, puntosReserva: config.puntosReserva ?? 10, puntosReferido: config.puntosReferido ?? 50, puntosPorDolar: config.puntosPorDolar ?? 1 } });
    } catch (err: any) {
        console.error('[club/quick-start PATCH]', err);
        return NextResponse.json({ error: 'No se pudieron guardar las reglas' }, { status: 500 });
    }
}
