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

        // 1. Obtener recompensas de referidos tradicionales
        const referralRewards = await prisma.referralReward.findMany({
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

        // 2. Obtener canjes por puntos (LoyaltyRedemption)
        const loyaltyRedemptions = await (prisma as any).loyaltyRedemption.findMany({
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
                Reward: {
                    select: {
                        id: true,
                        nombre: true,
                        tipo: true,
                        valor: true,
                        costoPuntos: true
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

        // Formatear recompensas de referidos
        const formattedReferrals = await Promise.all(referralRewards.map(async (reward) => {
            const validReferralsCount = await prisma.referralEvent.count({
                where: {
                    referrerId: reward.userId,
                    negocioId: reward.negocioId,
                    estado: "VALIDO"
                }
            });

            return {
                id: reward.id,
                tipoOrigen: "REFERIDO", // Bandera para diferenciar
                userId: reward.userId,
                negocioId: reward.negocioId,
                estado: reward.estado,
                fechaEntrega: reward.fechaEntrega,
                notas: reward.notas,
                createdAt: reward.createdAt,
                updatedAt: reward.updatedAt,
                Usuario: reward.Usuario,
                Staff: reward.Staff,
                Campaign: {
                    id: reward.Campaign.id,
                    nombre: reward.Campaign.nombre,
                    valorRecompensa: reward.Campaign.valorRecompensa
                },
                referidosValidos: validReferralsCount
            };
        }));

        // Formatear canjes de puntos
        const formattedLoyalty = loyaltyRedemptions.map((red: any) => ({
            id: red.id,
            tipoOrigen: "PUNTOS", // Bandera para diferenciar
            userId: red.userId,
            negocioId: red.negocioId,
            estado: red.estado,
            fechaEntrega: red.fechaEntrega,
            notas: red.notes || red.notas,
            createdAt: red.createdAt,
            updatedAt: red.updatedAt,
            Usuario: red.Usuario,
            Staff: red.Staff,
            Campaign: {
                id: red.Reward.id,
                nombre: `Canje por puntos (${red.Reward.costoPuntos} pts)`,
                valorRecompensa: red.Reward.nombre
            },
            referidosValidos: 0
        }));

        // Unificar y ordenar por fecha de creación descendente
        const allRewards = [...formattedReferrals, ...formattedLoyalty].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return NextResponse.json(allRewards);
    } catch (error: any) {
        console.error("Error fetching unified rewards:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
