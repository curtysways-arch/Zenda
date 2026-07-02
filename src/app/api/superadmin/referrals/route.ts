import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const roles = user.roles || [];
        const isSuperAdmin = roles.includes('SUPERADMIN') || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';

        if (!isSuperAdmin) {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        }

        const totalValidos = await prisma.referralEvent.count({ where: { estado: "VALIDO" } });
        const totalPendientes = await prisma.referralEvent.count({ where: { estado: "PENDIENTE" } });
        const totalCampaigns = await prisma.referralCampaign.count();
        const totalRewards = await prisma.referralReward.count();

        // Agregación de referidos por negocio en JS (100% compatible)
        const events = await prisma.referralEvent.findMany({
            where: { estado: "VALIDO" },
            select: { negocioId: true }
        });

        const negocioCounts: { [key: string]: number } = {};
        events.forEach(e => {
            negocioCounts[e.negocioId] = (negocioCounts[e.negocioId] || 0) + 1;
        });

        const rawBusinesses = await prisma.negocio.findMany({
            select: { id: true, nombre: true, slug: true }
        });

        const sortedBusinesses = rawBusinesses
            .map(b => ({
                id: b.id,
                nombre: b.nombre,
                slug: b.slug,
                referidosValidos: negocioCounts[b.id] || 0
            }))
            .sort((a, b) => b.referidosValidos - a.referidosValidos)
            .filter(b => b.referidosValidos > 0)
            .slice(0, 10);

        return NextResponse.json({
            stats: {
                totalValidos,
                totalPendientes,
                totalCampaigns,
                totalRewards
            },
            negocios: sortedBusinesses
        });
    } catch (error: any) {
        console.error("Error in superadmin referrals stats:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
