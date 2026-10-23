import { NextRequest, NextResponse } from "next/server";
import { getTeamContext, canAccessBusinessId, outsidePortfolio } from "@/lib/admin/teamGuard";
import { plansForBusiness } from "@/lib/superadmin/plansForBusiness";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { getFounderConfig, planService } from "@/lib/services/planService";
import { addDays, TRIAL_DAYS } from "@/lib/subscription/lifecycle";

async function isSuperAdmin() {
    // Usuario del equipo Citiox; el permiso de cada acción lo valida el middleware (lib/admin/teamAccessMap)
    return Boolean(await getTeamContext());
}

export async function POST(req: NextRequest) {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { negocioId, planId, action, dias, adminId, isAnnual } = body;

        if (!negocioId) {
            return NextResponse.json({ error: "Faltan campos obligatorios (negocioId)" }, { status: 400 });
        }
        // Vendedores con cartera: solo sus negocios
        const ctx = await getTeamContext();
        if (!ctx || !(await canAccessBusinessId(ctx, negocioId))) return outsidePortfolio();
        const autor = adminId || ctx.userId || (ctx.isOwner ? 'SUPERADMIN' : 'SISTEMA');

        const currentSub = await (prisma as any).suscripcion.findUnique({
            where: { negocioId },
            include: { Plan: true }
        });

        // Determinar planId de forma robusta
        let finalPlanId = planId;
        if (!finalPlanId) {
            if (currentSub?.planId) {
                finalPlanId = currentSub.planId;
            } else {
                // Seleccionar primer plan activo (ej. el PRO) como plan de inicio
                const defaultPlan = await prisma.plan.findFirst({
                    where: { activo: true, id: { not: 'founder' } },
                    orderBy: { price: 'desc' }
                });
                if (!defaultPlan) {
                    return NextResponse.json({ error: "No hay planes activos configurados en el sistema" }, { status: 400 });
                }
                finalPlanId = defaultPlan.id;
            }
        }

        const newPlan = await prisma.plan.findUnique({ where: { id: finalPlanId } });
        if (!newPlan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

        // Al cambiar de plan, solo se permiten los planes que corresponden al tipo de negocio
        if (action === 'CHANGE_PLAN') {
            const { plans } = await plansForBusiness(negocioId);
            if (!plans.some((p: any) => p.id === newPlan.id)) {
                return NextResponse.json({ error: "Ese plan no corresponde al tipo de este negocio." }, { status: 400 });
            }
        }

        let fechaFin = currentSub?.fechaFin ? new Date(currentSub.fechaFin) : new Date();
        if (fechaFin < new Date()) fechaFin = new Date();

        let tipoCambio = action || 'manual';

        if (action === 'RENEW') {
            fechaFin.setMonth(fechaFin.getMonth() + 1);
            tipoCambio = 'renovacion';
        } else if (action === 'RENEW_ANNUAL') {
            fechaFin.setFullYear(fechaFin.getFullYear() + 1);
            tipoCambio = 'renovacion anual';
        } else if (action === 'EXTEND' && dias) {
            fechaFin.setDate(fechaFin.getDate() + dias);
            tipoCambio = 'manual';
        } else if (action === 'START_TRIAL') {
            // Prueba estándar de 30 días desde hoy
            fechaFin = addDays(new Date(), TRIAL_DAYS);
        } else if (action === 'CHANGE_PLAN') {
            // Cambiar de plan no regala tiempo ni reinicia la prueba: se conservan las fechas
            if (currentSub?.fechaFin) fechaFin = new Date(currentSub.fechaFin);
            tipoCambio = currentSub
                ? (newPlan.price > (currentSub.Plan?.price || 0) ? 'upgrade' : 'downgrade')
                : 'manual';
        } else if (action === 'CANCEL') {
            tipoCambio = 'cancelacion';
        }

        // ── Lógica de Fundador ──
        let isFounder: boolean = currentSub?.isFounder ?? false;
        let founderPosition: number | null = currentSub?.founderPosition ?? null;
        let lockedPrice: number | null = currentSub?.lockedPrice ?? null;

        if (action === 'SET_FOUNDER') {
            // Cupos y precio del programa de fundadores del tipo de negocio
            const customPrice = body.lockedPrice !== undefined ? parseFloat(String(body.lockedPrice)) : null;
            const r = await planService.grantFounderManually(negocioId, customPrice);
            if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
            isFounder = true;
            founderPosition = r.position ?? null;
            lockedPrice = r.lockedPrice ?? null;
            tipoCambio = 'set_founder';
        } else if (action === 'REMOVE_FOUNDER') {
            await planService.removeFounder(negocioId);
            isFounder = false;
            founderPosition = null;
            lockedPrice = null;
            tipoCambio = 'remove_founder';
        }

        // Estado: renovar = activo; iniciar prueba = prueba; cancelar = cancelada.
        // Cambiar de plan, extender días o marcar fundador conservan el estado actual (una prueba sigue siendo prueba).
        const estadoFinal = action === 'CANCEL'
            ? 'canceled'
            : action === 'START_TRIAL'
                ? 'trial'
                : (action === 'RENEW' || action === 'RENEW_ANNUAL')
                    ? 'active'
                    : (currentSub?.estado && !['expired', 'vencida', 'canceled', 'cancelada'].includes(String(currentSub.estado).toLowerCase())
                        ? currentSub.estado
                        : (fechaFin > new Date() ? 'active' : (currentSub?.estado || 'trial')));

        const suscripcion = await (prisma as any).suscripcion.upsert({
            where: { negocioId },
            update: {
                planId: finalPlanId,
                fechaFin,
                estado: estadoFinal,
                isFounder,
                founderPosition,
                lockedPrice,
                trial_inicio: action === 'START_TRIAL' ? new Date() : undefined,
                trial_fin: action === 'START_TRIAL' ? fechaFin : undefined,
                updatedAt: new Date()
            },
            create: {
                id: crypto.randomUUID(),
                negocioId,
                planId: finalPlanId,
                fechaFin,
                estado: estadoFinal,
                isFounder,
                founderPosition,
                lockedPrice,
                trial_inicio: action === 'START_TRIAL' ? new Date() : null,
                trial_fin: action === 'START_TRIAL' ? fechaFin : null,
                updatedAt: new Date()
            }
        });

        // Registrar historial
        await (prisma as any).subscriptionHistory.create({
            data: {
                id: crypto.randomUUID(),
                negocio_id: negocioId,
                plan_anterior_id: currentSub?.planId || null,
                plan_nuevo_id: finalPlanId,
                tipo_cambio: tipoCambio,
                admin_id: autor
            }
        });

        // Actualizar estado del negocio
        await prisma.negocio.update({
            where: { id: negocioId },
            data: { estado: action === 'CANCEL' ? 'SUSPENDIDO' : 'ACTIVO' }
        });

        return NextResponse.json(suscripcion);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error al gestionar la suscripción" }, { status: 500 });
    }
}
