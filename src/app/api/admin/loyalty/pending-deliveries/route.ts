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

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";

        // 1. Obtener ReferralRewards (Campaña / Referidos) PENDIENTE_ENTREGA
        const referralRewards = await prisma.referralReward.findMany({
            where: {
                negocioId,
                estado: "PENDIENTE_ENTREGA",
                Usuario: {
                    OR: [
                        { nombre: { contains: search, mode: "insensitive" } },
                        { phone: { contains: search } }
                    ]
                }
            },
            include: {
                Usuario: {
                    select: { id: true, nombre: true, phone: true, email: true }
                },
                Campaign: {
                    select: { id: true, nombre: true, valorRecompensa: true, rewardType: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // 2. Obtener LoyaltyRedemptions (Canje por Puntos) PENDIENTE_ENTREGA
        const loyaltyRedemptions = await (prisma as any).loyaltyRedemption.findMany({
            where: {
                negocioId,
                estado: "PENDIENTE_ENTREGA",
                Usuario: {
                    OR: [
                        { nombre: { contains: search, mode: "insensitive" } },
                        { phone: { contains: search } }
                    ]
                }
            },
            include: {
                Usuario: {
                    select: { id: true, nombre: true, phone: true, email: true }
                },
                Reward: {
                    select: { id: true, nombre: true, tipo: true, costoPuntos: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Formatear ambos
        const formattedReferrals = referralRewards.map(reward => ({
            id: reward.id,
            tipoOrigen: "REFERIDO",
            claimCode: reward.claimCode || "N/A",
            createdAt: reward.createdAt,
            estado: reward.estado,
            Usuario: reward.Usuario,
            premioNombre: reward.Campaign.nombre,
            detallesRecompensa: reward.Campaign.valorRecompensa,
            costoPuntos: 0
        }));

        const formattedLoyalty = loyaltyRedemptions.map((red: any) => ({
            id: red.id,
            tipoOrigen: "PUNTOS",
            claimCode: red.claimCode || "N/A",
            createdAt: red.createdAt,
            estado: red.estado,
            Usuario: red.Usuario,
            premioNombre: red.Reward.nombre,
            detallesRecompensa: `Canje por puntos`,
            costoPuntos: red.Reward.costoPuntos
        }));

        // Unificar y ordenar por fecha descendente
        const allPending = [...formattedReferrals, ...formattedLoyalty].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return NextResponse.json(allPending);
    } catch (error: any) {
        console.error("Error fetching pending deliveries:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const businessUserStaffId = user.id; // Guardamos el ID del usuario administrador que realiza la entrega

        const body = await req.json();
        const { rewardId, tipoOrigen, estado, observaciones } = body;

        if (!rewardId || !tipoOrigen || !estado) {
            return NextResponse.json({ error: "Campos faltantes: rewardId, tipoOrigen, estado" }, { status: 400 });
        }

        // El estado debe ser ENTREGADO, CANCELADO o VENCIDO
        const validStatuses = ["ENTREGADO", "CANCELADO", "VENCIDO"];
        if (!validStatuses.includes(estado)) {
            return NextResponse.json({ error: "Estado de entrega inválido" }, { status: 400 });
        }

        let result;
        const now = new Date();

        if (tipoOrigen === "REFERIDO") {
            result = await prisma.referralReward.update({
                where: { id: rewardId },
                data: {
                    estado: estado as any,
                    entregadoPorId: businessUserStaffId,
                    fechaEntregaConfirmada: estado === "ENTREGADO" ? now : null,
                    observaciones: observaciones || null,
                    updatedAt: now
                }
            });
        } else if (tipoOrigen === "PUNTOS") {
            result = await (prisma as any).loyaltyRedemption.update({
                where: { id: rewardId },
                data: {
                    estado: estado as any,
                    entregadoPorId: businessUserStaffId,
                    fechaEntregaConfirmada: estado === "ENTREGADO" ? now : null,
                    observaciones: observaciones || null,
                    updatedAt: now
                }
            });
        } else {
            return NextResponse.json({ error: "Tipo de origen inválido" }, { status: 400 });
        }

        return NextResponse.json({ success: true, reward: result });
    } catch (error: any) {
        console.error("Error updating pending delivery:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
