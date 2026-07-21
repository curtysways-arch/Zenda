import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { RewardService } from "@/lib/loyalty/rewardService";
import { whatsappService } from "@/lib/whatsapp";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const negocioId = (session.user as any).negocioId;
        if (!negocioId) {
            return NextResponse.json({ error: "Usuario sin negocio asignado" }, { status: 403 });
        }

        const body = await req.json();
        const { claimToken, action, sig } = body; // action: 'READY' | 'DELIVER'

        if (!claimToken || !action) {
            return NextResponse.json({ error: "Parámetros obligatorios faltantes" }, { status: 400 });
        }

        // Validar firma de seguridad
        if (!RewardService.verifySignature(claimToken, sig)) {
            return NextResponse.json({ error: "Firma digital del QR inválida" }, { status: 400 });
        }

        // Obtener el premio actual
        const reward = await RewardService.findByClaimToken(claimToken);
        if (!reward) {
            return NextResponse.json({ error: "Premio no encontrado" }, { status: 404 });
        }

        if (reward.negocioId !== negocioId) {
            return NextResponse.json({ error: "Este premio pertenece a otro negocio" }, { status: 403 });
        }

        let newStatus = reward.estado;
        let auditAction = '';

        if (action === 'READY') {
            if (reward.estado !== 'SOLICITADO') {
                return NextResponse.json({ error: "El premio debe estar en estado SOLICITADO para prepararse" }, { status: 400 });
            }
            newStatus = 'LISTO_PARA_RETIRAR';
            auditAction = 'READY';
        } else if (action === 'DELIVER') {
            if (reward.estado !== 'LISTO_PARA_RETIRAR') {
                return NextResponse.json({ error: "El premio debe estar listo para retirar para entregarse" }, { status: 400 });
            }
            newStatus = 'ENTREGADO';
            auditAction = 'DELIVERED';
        }

        // Registrar auditoría de la acción
        const reqHeaders = req.headers;
        const ip = reqHeaders.get("x-forwarded-for") || "";
        const userAgent = reqHeaders.get("user-agent") || "";

        await RewardService.createAudit(reward.id, reward.tipoOrigen, auditAction, {
            negocioId,
            claimCode: reward.claimCode,
            oldStatus: reward.estado,
            newStatus,
            employeeId: (session.user as any).id,
            ip,
            userAgent
        });

        // Actualizar el estado del premio
        const updated = await RewardService.updateStatus(reward.id, reward.tipoOrigen, newStatus, (session.user as any).id);

        // Enviar alertas si pasa a listo para retirar
        if (newStatus === 'LISTO_PARA_RETIRAR') {
            // Notificación por WhatsApp
            try {
                if (updated.Usuario?.phone) {
                    const msg = `🎉 ¡Hola ${updated.Usuario.nombre || 'Cliente'}! Tu premio "${reward.nombre}" ya está listo para retirar. Presenta tu código: ${reward.claimCode || ''} en recepción.`;
                    await whatsappService.sendWhatsApp(updated.Usuario.phone, msg, true, 'recompensa_lista');
                }
            } catch (wsErr) {
                console.error("Error al enviar WhatsApp de aviso de retiro:", wsErr);
            }
        }

        return NextResponse.json({ 
            success: true, 
            estado: newStatus,
            reward: updated 
        });

    } catch (error: any) {
        console.error("Error al procesar acción de entrega de premio:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
