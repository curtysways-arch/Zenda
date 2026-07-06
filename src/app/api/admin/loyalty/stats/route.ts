import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        // 1. Estadísticas básicas
        const totalCampanas = await prisma.referralCampaign.count({ where: { negocioId } });
        const totalReferidos = await prisma.referralEvent.count({ where: { negocioId, estado: "VALIDO" } });
        const totalPremiosDisponibles = await prisma.referralReward.count({ where: { negocioId, estado: "DISPONIBLE" } });
        const totalPremiosCanjeados = await prisma.referralReward.count({ where: { negocioId, estado: "CANJEADO" } });

        // 2. Clientes más influyentes (referidores estrella)
        const topReferrersRaw = await prisma.referralEvent.groupBy({
            by: ['referrerId'],
            where: { negocioId, estado: "VALIDO" },
            _count: { referrerId: true },
            orderBy: { _count: { referrerId: 'desc' } },
            take: 5
        });

        const topReferrers = await Promise.all(topReferrersRaw.map(async (item) => {
            const u = await prisma.usuario.findUnique({
                where: { id: item.referrerId },
                select: { nombre: true, phone: true }
            });
            return {
                nombre: u?.nombre || "Cliente Anónimo",
                telefono: u?.phone || "",
                cantidad: item._count.referrerId
            };
        }));

        // 3. Ingresos estimados generados por campañas
        // Sumamos el total cobrado de todas las citas asociadas a referidos válidos
        const appointmentsWithRevenue = await prisma.appointment.findMany({
            where: {
                negocioId,
                estado: "completed",
                ReferralEvent: {
                    some: { estado: "VALIDO" }
                }
            },
            select: { total: true }
        });

        const ingresosGenerados = appointmentsWithRevenue.reduce((acc, appt) => acc + (appt.total || 0), 0);

        // 4. ROI Estimado (Ingresos / Premios canjeados de valor ficticio o real)
        const costoEstimadoPremios = totalPremiosCanjeados * 15; // Asumimos un costo promedio de $15 por premio
        const roiEstimado = costoEstimadoPremios > 0 ? (ingresosGenerados - costoEstimadoPremios) / costoEstimadoPremios * 100 : 0;

        // 5. Total puntos entregados vs canjeados
        const historyAgg = await (prisma as any).pointsHistory.groupBy({
            by: ['puntos'],
            where: { negocioId },
            _sum: { puntos: true }
        });

        let puntosEntregados = 0;
        let puntosCanjeados = 0;
        
        for (const item of historyAgg) {
            const val = item._sum.puntos || 0;
            if (val > 0) puntosEntregados += val;
            else puntosCanjeados += Math.abs(val);
        }

        return NextResponse.json({
            summary: {
                totalCampanas,
                totalReferidos,
                totalPremiosDisponibles,
                totalPremiosCanjeados,
                ingresosGenerados,
                roiEstimado: roiEstimado.toFixed(1),
                puntosEntregados,
                puntosCanjeados
            },
            topReferrers
        });
    } catch (error: any) {
        console.error("Error fetching stats:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
