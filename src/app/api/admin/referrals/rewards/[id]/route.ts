import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { whatsappService } from "@/lib/whatsapp";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const { id } = await params;
        const body = await req.json();
        const { estado, staffId, notas } = body;

        // Verificar existencia del premio
        const reward = await prisma.referralReward.findFirst({
            where: { id, negocioId },
            include: {
                Campaign: true,
                Negocio: true
            }
        });

        if (!reward) {
            return NextResponse.json({ error: "Recompensa no encontrada" }, { status: 404 });
        }

        const dataToUpdate: any = {
            estado: estado || undefined,
            notas: notas !== undefined ? notas : undefined,
            updatedAt: new Date()
        };

        if (estado === "CANJEADO") {
            dataToUpdate.fechaEntrega = new Date();
            if (staffId) {
                dataToUpdate.Staff = { connect: { id: staffId } };
            }
        }

        const updated = await prisma.referralReward.update({
            where: { id },
            data: dataToUpdate,
            include: {
                Usuario: true,
                Campaign: true,
                Staff: true
            }
        });

        // Enviar notificación al cliente de que se entregó su premio
        if (estado === "CANJEADO" && updated.Usuario?.phone) {
            try {
                const staffName = updated.Staff?.name ? ` por *${updated.Staff.name}*` : "";
                const msg = `🎁 *¡Premio Canjeado con Éxito!* 🎁\n\nHola *${updated.Usuario.nombre}*,\n\nConfirmamos la entrega de tu premio:\n🏆 *"${updated.Campaign.valorRecompensa}"*\n🏢 En: *${reward.Negocio.nombre}*${staffName}.\n\n¡Gracias por seguir recomendándonos! Sigue compartiendo tu enlace para ganar más premios. 🚀`;
                await whatsappService.sendWhatsApp(updated.Usuario.phone, msg, true, 'recompensa_entregada');
            } catch (err) {
                console.error("[Referidos] Error al enviar WhatsApp de entrega:", err);
            }
        }

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Error updating reward status:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
