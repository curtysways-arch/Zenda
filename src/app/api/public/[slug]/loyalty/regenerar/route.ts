import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { RewardService } from "@/lib/loyalty/rewardService";
import crypto from "crypto";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get("customer_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Sesión no válida o expirada" }, { status: 401 });
        }

        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
        let payload;
        try {
            const verification = await jwtVerify(token, secret);
            payload = verification.payload;
        } catch (e) {
            return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });
        }

        const phone = payload.telefono as string;
        const negocioId = payload.negocioId as string;

        // 1. Obtener usuario
        const digitsOnly = phone.replace(/\D/g, '');
        const user = await prisma.usuario.findFirst({
            where: {
                OR: [
                    { phone: phone },
                    { phone: digitsOnly }
                ]
            }
        });

        if (!user) return NextResponse.json({ error: "Usuario no registrado" }, { status: 404 });

        const body = await req.json();
        const { redemptionId, tipoOrigen } = body; // tipoOrigen: 'PUNTOS' | 'REFERIDO'

        if (!redemptionId || !tipoOrigen) {
            return NextResponse.json({ error: "Parámetros obligatorios faltantes" }, { status: 400 });
        }

        // 2. Cargar el premio actual
        let currentReward;
        if (tipoOrigen === 'PUNTOS') {
            currentReward = await prisma.loyaltyRedemption.findFirst({
                where: { id: redemptionId, userId: user.id, negocioId }
            });
        } else {
            currentReward = await prisma.referralReward.findFirst({
                where: { id: redemptionId, userId: user.id, negocioId }
            });
        }

        if (!currentReward) {
            return NextResponse.json({ error: "Premio no encontrado" }, { status: 404 });
        }

        const esValidoParaRegenerar = 
            (currentReward.estado === 'SOLICITADO' || currentReward.estado === 'LISTO_PARA_RETIRAR') &&
            currentReward.claimTokenExpiresAt && 
            new Date(currentReward.claimTokenExpiresAt) < new Date();

        if (!esValidoParaRegenerar) {
            return NextResponse.json({ 
                error: "El código no está expirado o el estado actual no permite regeneración." 
            }, { status: 400 });
        }

        // 3. Registrar auditoría de expiración anterior
        await RewardService.createAudit(redemptionId, tipoOrigen, 'TOKEN_EXPIRED', {
            negocioId,
            claimCode: currentReward.claimCode,
            oldStatus: currentReward.estado,
            newStatus: currentReward.estado
        });

        // 4. Generar nuevo token y expiración
        const nuevoToken = crypto.randomUUID();
        const nuevoExpiracion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

        let updated;
        if (tipoOrigen === 'PUNTOS') {
            updated = await prisma.loyaltyRedemption.update({
                where: { id: redemptionId },
                data: {
                    claimToken: nuevoToken,
                    claimTokenExpiresAt: nuevoExpiracion,
                    updatedAt: new Date()
                }
            });
        } else {
            updated = await prisma.referralReward.update({
                where: { id: redemptionId },
                data: {
                    claimToken: nuevoToken,
                    claimTokenExpiresAt: nuevoExpiracion,
                    updatedAt: new Date()
                }
            });
        }

        // 5. Registrar auditoría de regeneración
        await RewardService.createAudit(redemptionId, tipoOrigen, 'REGENERATED', {
            negocioId,
            claimCode: currentReward.claimCode,
            oldStatus: currentReward.estado,
            newStatus: currentReward.estado
        });

        return NextResponse.json({ 
            success: true, 
            claimToken: nuevoToken, 
            claimTokenExpiresAt: nuevoExpiracion 
        });

    } catch (error: any) {
        console.error("Error al regenerar token de premio:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
