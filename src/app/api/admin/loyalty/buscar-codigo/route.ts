import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { RewardService } from "@/lib/loyalty/rewardService";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const negocioId = (session.user as any).negocioId;
        if (!negocioId) {
            return NextResponse.json({ error: "Usuario sin negocio asignado" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const claimCode = searchParams.get("claimCode");

        if (!claimCode) {
            return NextResponse.json({ error: "Código de reclamo faltante" }, { status: 400 });
        }

        // Buscar premio por código corto
        const reward = await RewardService.findByClaimCode(negocioId, claimCode);

        if (!reward) {
            return NextResponse.json({ error: "Premio no encontrado o no pertenece a este negocio" }, { status: 404 });
        }

        // Retornar claimToken y sig para la redirección
        const sig = reward.claimToken ? RewardService.generateHMAC(reward.claimToken) : '';
        return NextResponse.json({ 
            success: true, 
            claimToken: reward.claimToken,
            sig
        });

    } catch (error: any) {
        console.error("Error al buscar premio por código corto:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
