import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function isSuperAdmin() {
    const session = await getServerSession(authOptions);
    return (session?.user as any)?.role === 'SUPER_ADMIN';
}

export async function GET() {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const solicitudes = await (prisma.suscripcion as any).findMany({
            where: { pagoPendiente: true },
            include: {
                negocio: {
                    select: {
                        id: true,
                        nombre: true,
                        slug: true,
                    }
                },
                plan: true,
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
