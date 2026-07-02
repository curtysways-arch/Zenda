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

        const events = await prisma.referralEvent.findMany({
            where: { negocioId },
            include: {
                Campaign: {
                    select: {
                        nombre: true,
                        valorRecompensa: true
                    }
                },
                Usuario: { // Referidor
                    select: {
                        nombre: true,
                        phone: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Buscar perfiles de los usuarios invitados (referredId) en una consulta por lote
        const referredIds = events.map(e => e.referredId).filter(Boolean);
        const referredUsers = await prisma.usuario.findMany({
            where: { id: { in: referredIds } },
            select: {
                id: true,
                nombre: true,
                phone: true
            }
        });

        const referredMap = new Map(referredUsers.map(u => [u.id, u]));

        const formatted = events.map(e => {
            const referred = referredMap.get(e.referredId);
            return {
                id: e.id,
                fecha: e.createdAt,
                estado: e.estado,
                ip: e.ipAddress || "-",
                dispositivo: e.userAgent ? e.userAgent.substring(0, 50) + "..." : "-",
                campaignName: e.Campaign?.nombre || "Campaña General",
                rewardValue: e.Campaign?.valorRecompensa || "",
                referrerName: e.Usuario?.nombre || "Anónimo",
                referrerPhone: e.Usuario?.phone || "",
                referredName: referred?.nombre || "Cliente Invitado",
                referredPhone: referred?.phone || ""
            };
        });

        return NextResponse.json(formatted);
    } catch (error: any) {
        console.error("Error fetching referral history:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
