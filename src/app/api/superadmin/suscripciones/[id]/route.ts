import { NextRequest, NextResponse } from "next/server";
import { getTeamContext, canAccessBusinessId, outsidePortfolio } from "@/lib/admin/teamGuard";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBusinessTimeZone, getSubscriptionDates } from "@/lib/dateUtils";
import { getFounderConfig } from "@/lib/services/planService";

async function isSuperAdmin() {
    // Usuario del equipo Citiox; el permiso de cada acción lo valida el middleware (lib/admin/teamAccessMap)
    return Boolean(await getTeamContext());
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id } = await params;
        const { action, planId, dias } = body;

        const sub = await prisma.suscripcion.findUnique({
            where: { id },
            include: { Negocio: true }
        });

        if (!sub) return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
        {
            const team = await getTeamContext();
            if (!team || !(await canAccessBusinessId(team, sub.negocioId))) return outsidePortfolio();
        }

        const timeZone = getBusinessTimeZone(sub.Negocio?.configuracion);
        let nuevaFechaFin = new Date(sub.fechaFin);
        const hoy = new Date();

        if (action === 'RENEW') {
            if (nuevaFechaFin < hoy) {
                // Si ya venció, se renueva a partir de hoy alineado a días completos
                const dates = getSubscriptionDates(timeZone, { durationMonths: 1, baseDate: hoy });
                nuevaFechaFin = dates.endDate;
            } else {
                // Si aún está vigente, se suma N meses manteniendo la alineación
                nuevaFechaFin = new Date(nuevaFechaFin);
                nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);
            }
        } else if (action === 'EXTEND' && dias) {
            nuevaFechaFin.setDate(nuevaFechaFin.getDate() + dias);
        }

        // Renovar activa el plan; extender días o cambiar de plan conservan el estado
        // (una prueba extendida sigue siendo prueba y no se le reinician las fechas).
        const estadoActual = String(sub.estado || '').toLowerCase();
        const vencida = ['expired', 'vencida', 'canceled', 'cancelada'].includes(estadoActual);
        const data: any = {
            fechaFin: nuevaFechaFin,
            estado: action === 'CANCEL'
                ? 'canceled'
                : action === 'RENEW'
                    ? 'active'
                    : (vencida && nuevaFechaFin > hoy ? 'active' : sub.estado),
            updatedAt: new Date()
        };

        // Preservar estado de fundador por defecto
        // Solo modificar con acciones explícitas SET_FOUNDER / REMOVE_FOUNDER
        if (action === 'SET_FOUNDER') {
            // Usa los cupos y el precio del programa de fundadores del tipo de negocio
            const { planService } = await import('@/lib/services/planService');
            const customPrice = body.lockedPrice !== undefined ? parseFloat(String(body.lockedPrice)) : null;
            const r = await planService.grantFounderManually(sub.negocioId, customPrice);
            if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
        } else if (action === 'REMOVE_FOUNDER') {
            const { planService } = await import('@/lib/services/planService');
            await planService.removeFounder(sub.negocioId);
        }

        // Cambio de plan: NO toca isFounder / lockedPrice / founderPosition
        if (planId) {
            data.planId = planId;
        }

        const updatedSub = await prisma.suscripcion.update({
            where: { id },
            data
        });

        if (action === 'CANCEL') {
            await prisma.negocio.update({
                where: { id: sub.negocioId },
                data: { estado: 'SUSPENDIDO' }
            });
        } else if (nuevaFechaFin > hoy) {
            await prisma.negocio.update({
                where: { id: sub.negocioId },
                data: { estado: 'ACTIVO' }
            });
        }

        return NextResponse.json(updatedSub);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error al actualizar la suscripción" }, { status: 500 });
    }
}
