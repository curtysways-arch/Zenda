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
        const totalValidos = await prisma.referralEvent.count({
            where: { negocioId, estado: "VALIDO" }
        });

        const totalPendientes = await prisma.referralEvent.count({
            where: { negocioId, estado: "PENDIENTE" }
        });

        const campañasActivas = await prisma.referralCampaign.count({
            where: { negocioId, activa: true }
        });

        const premiosDisponibles = await prisma.referralReward.count({
            where: { negocioId, estado: "DISPONIBLE" }
        });

        const premiosCanjeados = await prisma.referralReward.count({
            where: { negocioId, estado: "CANJEADO" }
        });

        // 2. Ranking de embajadores (Top 10 referidores)
        const events = await prisma.referralEvent.findMany({
            where: { negocioId, estado: "VALIDO" },
            select: {
                referrerId: true,
                Usuario: {
                    select: {
                        nombre: true,
                        phone: true
                    }
                }
            }
        });

        const countsMap: { [key: string]: { nombre: string; phone: string; count: number } } = {};

        events.forEach(e => {
            if (!e.referrerId) return;
            const name = e.Usuario?.nombre || "Invitador Anónimo";
            const phone = e.Usuario?.phone || "";

            if (!countsMap[e.referrerId]) {
                countsMap[e.referrerId] = {
                    nombre: name,
                    phone: phone,
                    count: 0
                };
            }
            countsMap[e.referrerId].count++;
        });

        const topEmbajadores = Object.values(countsMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return NextResponse.json({
            stats: {
                totalValidos,
                totalPendientes,
                campañasActivas,
                premiosDisponibles,
                premiosCanjeados
            },
            topEmbajadores
        });
    } catch (error: any) {
        console.error("Error fetching stats:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
