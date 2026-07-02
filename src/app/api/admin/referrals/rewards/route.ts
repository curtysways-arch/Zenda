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

        const rewards = await prisma.referralReward.findMany({
            where: { negocioId },
            include: {
                Usuario: {
                    select: {
                        id: true,
                        nombre: true,
                        phone: true,
                        email: true
                    }
                },
                Campaign: {
                    select: {
                        id: true,
                        nombre: true,
                        tipoRecompensa: true,
                        valorRecompensa: true,
                        referidosRequeridos: true
                    }
                },
                Staff: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Contar el progreso actual de referidos válidos activos para cada usuario
        // de forma que en la tabla sepamos cuántos referidos tiene en total
        const formattedRewards = await Promise.all(rewards.map(async (reward) => {
            const validReferralsCount = await prisma.referralEvent.count({
                where: {
                    referrerId: reward.userId,
                    negocioId: reward.negocioId,
                    estado: "VALIDO"
                }
            });

            return {
                ...reward,
                referidosValidos: validReferralsCount
            };
        }));

        return NextResponse.json(formattedRewards);
    } catch (error: any) {
        console.error("Error fetching rewards:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
