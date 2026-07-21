import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NotificationService } from "@/lib/notifications/notificationService";
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
        const { redemptionId } = body;

        if (!redemptionId) {
            return NextResponse.json({ error: "ID de redención faltante" }, { status: 400 });
        }

        // 2. Buscar la redención en ambas tablas
        let redemptionType: 'PUNTOS' | 'REFERIDO' = 'PUNTOS';
        let redemption = await prisma.loyaltyRedemption.findFirst({
            where: { id: redemptionId, userId: user.id, negocioId },
            include: { Reward: true }
        });

        if (!redemption) {
            // Buscar en premios de referidos
            const refReward = await prisma.referralReward.findFirst({
                where: { id: redemptionId, userId: user.id, negocioId },
                include: { Campaign: true }
            });
            if (refReward) {
                redemptionType = 'REFERIDO';
                redemption = {
                    id: refReward.id,
                    negocioId: refReward.negocioId,
                    userId: refReward.userId,
                    rewardId: refReward.campaignId,
                    estado: refReward.estado,
                    claimCode: refReward.claimCode,
                    fechaSolicitud: (refReward as any).fechaSolicitud,
                    fechaRetiro: (refReward as any).fechaRetiro,
                    claimToken: (refReward as any).claimToken,
                    claimTokenExpiresAt: (refReward as any).claimTokenExpiresAt,
                    scanCount: (refReward as any).scanCount,
                    // Mapeo básico para unificar
                    Reward: {
                        nombre: refReward.Campaign.nombre || "Premio de Referido",
                        rewardType: refReward.Campaign.rewardType || "REGALO_FISICO"
                    }
                } as any;
            }
        }

        if (!redemption) {
            return NextResponse.json({ error: "Redención no encontrada" }, { status: 404 });
        }

        if (redemption.estado !== 'PENDIENTE_ENTREGA' && redemption.estado !== 'DISPONIBLE') {
            return NextResponse.json({ 
                error: `El premio no se puede solicitar. Estado actual: ${redemption.estado}` 
            }, { status: 400 });
        }

        // 3. Generar token, código corto y expiración
        const claimToken = redemption.claimToken || crypto.randomUUID();
        const claimCode = redemption.claimCode || `CTX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const claimTokenExpiresAt = redemption.claimTokenExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días de validez

        // 4. Actualizar estado a SOLICITADO usando la tabla correspondiente
        let updated;
        if (redemptionType === 'PUNTOS') {
            updated = await prisma.loyaltyRedemption.update({
                where: { id: redemptionId },
                data: {
                    estado: 'SOLICITADO',
                    claimToken,
                    claimCode,
                    claimTokenExpiresAt,
                    fechaSolicitud: new Date(),
                    updatedAt: new Date()
                }
            });
        } else {
            updated = await prisma.referralReward.update({
                where: { id: redemptionId },
                data: {
                    estado: 'SOLICITADO',
                    claimToken,
                    claimCode,
                    claimTokenExpiresAt,
                    fechaSolicitud: new Date(),
                    updatedAt: new Date()
                }
            });
        }

        // 5. Registrar en la tabla de Auditoría
        await RewardService.createAudit(redemptionId, redemptionType, 'REQUESTED', {
            negocioId,
            claimCode: redemption.claimCode,
            oldStatus: 'PENDIENTE_ENTREGA',
            newStatus: 'SOLICITADO'
        });

        // 6. Notificar al negocio
        try {
            await NotificationService.createNotification({
                negocioId,
                tipo: 'PREMIO',
                categoria: 'SISTEMA',
                titulo: '🎁 Solicitud de Premio Físico',
                descripcion: `El cliente ${user.nombre} (${user.phone}) ha solicitado retirar el premio: ${redemption.Reward.nombre}.`,
                icono: 'Gift',
                prioridad: 'INFO',
                recipientType: 'ALL'
            });
        } catch (notifErr) {
            console.error("Error al crear notificación de solicitud para el negocio:", notifErr);
        }

        return NextResponse.json({ success: true, estado: 'SOLICITADO', redemption: updated });

    } catch (error: any) {
        console.error("Error al solicitar premio:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
