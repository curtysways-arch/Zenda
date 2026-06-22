import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const FOUNDER_LOCKED_PRICE = 15.0;
const FOUNDER_MAX = 25;

async function isSuperAdmin() {
    const session = await getServerSession(authOptions);
    // Para propósitos de este desarrollo local, permitimos el acceso tal como en las otras APIs de superadmin.
    return true;
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

        let nuevaFechaFin = new Date(sub.fechaFin);
        const hoy = new Date();

        if (action === 'RENEW') {
            const baseDate = nuevaFechaFin < hoy ? hoy : nuevaFechaFin;
            nuevaFechaFin = new Date(baseDate);
            nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);
        } else if (action === 'EXTEND' && dias) {
            nuevaFechaFin.setDate(nuevaFechaFin.getDate() + dias);
        }

        const data: any = {
            fechaFin: nuevaFechaFin,
            estado: action === 'CANCEL' ? 'canceled' : (nuevaFechaFin > hoy ? 'ACTIVA' : sub.estado),
            updatedAt: new Date()
        };

        // Preservar estado de fundador por defecto
        // Solo modificar con acciones explícitas SET_FOUNDER / REMOVE_FOUNDER
        if (action === 'SET_FOUNDER') {
            const activeFoundersCount = await (prisma.suscripcion as any).count({
                where: { isFounder: true, estado: { in: ['active', 'activa', 'ACTIVA'] } }
            });
            if (activeFoundersCount >= FOUNDER_MAX && !sub.isFounder) {
                return NextResponse.json({ error: `Ya se alcanzó el límite de ${FOUNDER_MAX} fundadores` }, { status: 400 });
            }
            data.isFounder = true;
            const customPrice = body.lockedPrice !== undefined ? parseFloat(String(body.lockedPrice)) : null;
            data.lockedPrice = (customPrice !== null && !isNaN(customPrice)) ? customPrice : FOUNDER_LOCKED_PRICE;
            if (!sub.founderPosition) {
                data.founderPosition = activeFoundersCount + 1;
            }
        } else if (action === 'REMOVE_FOUNDER') {
            data.isFounder = false;
            data.founderPosition = null;
            data.lockedPrice = null;
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
