import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveAdminSession } from "@/lib/delegatedAuth";

export const dynamic = 'force-dynamic';

async function isSuperAdmin() {
    const session = await getEffectiveAdminSession();
    const user = session?.user as any;
    const role = user?.role;
    const roles = user?.roles || [];
    return role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN' || roles.includes('SUPERADMIN') || roles.includes('SUPER_ADMIN') || user?.isAdminUser;
}

export async function GET() {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const solicitudes = await (prisma.suscripcion as any).findMany({
            where: { pagoPendiente: true },
            include: {
                Negocio: {
                    select: {
                        id: true,
                        nombre: true,
                        slug: true,
                    }
                },
                Plan: true,
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Enriquecer con el nombre del plan solicitado
        const enriched = await Promise.all(
            solicitudes.map(async (sol) => {
                let planSolicitado = null;
                if (sol.solicitudPlanId) {
                    planSolicitado = await prisma.plan.findUnique({
                        where: { id: sol.solicitudPlanId }
                    });
                }
                return {
                    ...sol,
                    negocio: sol.Negocio || (sol as any).negocio,
                    plan: sol.Plan || (sol as any).plan,
                    planSolicitado,
                };
            })
        );

        return NextResponse.json(enriched);
    } catch (error) {
        console.error("Error obteniendo solicitudes:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
