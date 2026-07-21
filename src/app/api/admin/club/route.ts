import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ClubResolver } from "@/lib/growth/clubResolver";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/club
 *
 * Devuelve el estado completo del Club Citiox para el negocio del admin autenticado.
 * Todos los recursos ya vienen resueltos por el ClubResolver:
 *   - source: "GLOBAL" | "LOCAL"
 *   - mode: "INHERITED" | "CUSTOMIZED" | "DISABLED"
 *   - data: el recurso concreto
 *
 * El frontend NUNCA necesita saber si el dato es global o local —
 * solo se lo indicamos visualmente con el badge.
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        // Resolver el estado completo del Club (niveles, temporada, premios, cupones)
        const club = await ClubResolver.resolveClub(negocioId);

        // Las misiones se cargan por separado (ya tienen su propio endpoint)
        const missions = await prisma.businessMission.findMany({
            where: { negocioId },
            include: {
                MissionDefinition: {
                    include: {
                        Rewards: { include: { RewardCatalog: true } },
                    },
                },
            },
        });

        return NextResponse.json({
            season: club.season,
            levels: club.levels,
            missions: missions.map(m => ({
                source: 'INHERITED' as const,
                mode: 'INHERITED' as const,
                resourceId: m.missionDefinitionId,
                data: {
                    ...m.MissionDefinition,
                    businessMissionId: m.id,
                    status: m.status,
                    rewardConfiguration: m.rewardConfiguration,
                },
            })),
            rewards: club.rewards,
            coupons: club.coupons,
        });

    } catch (error: any) {
        console.error("[GET /api/admin/club] Error:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
