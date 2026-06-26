import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { getFounderConfig } from "@/lib/services/planService";

async function isSuperAdmin() {
    const session = await getServerSession(authOptions);
    console.log("SUPERADMIN_CHECK_SESSION:", JSON.stringify(session?.user || "null"));
    // Para propósitos de este desarrollo local, permitimos el acceso tal como en las otras APIs de superadmin.
    return true;
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
        } else if (action === 'CHANGE_PLAN') {
            if (isAnnual) {
                fechaFin.setFullYear(fechaFin.getFullYear() + 1);
            } else {
                fechaFin.setMonth(fechaFin.getMonth() + 1);
            }
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
            const { founderLockedPrice, founderMax } = await getFounderConfig();
            const activeFoundersCount = await (prisma.suscripcion as any).count({
                where: { isFounder: true, estado: { in: ['active', 'activa', 'ACTIVA'] } }
            });
            if (activeFoundersCount >= founderMax && !isFounder) {
                return NextResponse.json({ error: `Ya se alcanzó el límite de ${founderMax} fundadores` }, { status: 400 });
            }
            isFounder = true;
            const customPrice = body.lockedPrice !== undefined ? parseFloat(String(body.lockedPrice)) : null;
            lockedPrice = (customPrice !== null && !isNaN(customPrice)) ? customPrice : founderLockedPrice;
            if (!founderPosition) {
                founderPosition = activeFoundersCount + 1;
            }
            tipoCambio = 'set_founder';
        } else if (action === 'REMOVE_FOUNDER') {
            isFounder = false;
            founderPosition = null;
            lockedPrice = null;
            tipoCambio = 'remove_founder';
        }

        const estadoFinal = action === 'CANCEL'
            ? 'canceled'
            : (action === 'START_TRIAL' ? 'trial' : 'activa');

        const suscripcion = await (prisma as any).suscripcion.upsert({
            where: { negocioId },
            update: {
                planId: finalPlanId,
                fechaFin,
                estado: estadoFinal,
                isFounder,
                founderPosition,
                lockedPrice,
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
                admin_id: adminId || 'SISTEMA'
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
