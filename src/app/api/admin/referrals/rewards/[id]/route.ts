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
        const { estado, staffId, notas, observaciones } = body;

        const businessUserStaffId = user.id;

        // 1. Verificar primero si el id corresponde a un canje de puntos (LoyaltyRedemption)
        const loyaltyRedemption = await (prisma as any).loyaltyRedemption.findFirst({
            where: { id, negocioId },
            include: {
                Reward: true,
                Negocio: true,
                Usuario: true
            }
        });

        if (loyaltyRedemption) {
            const isDelivered = estado === "CANJEADO" || estado === "ENTREGADO";
            const finalState = estado ? (estado === "CANJEADO" ? "CANJEADO" : estado) : undefined;

            const dataToUpdate: any = {
                estado: finalState || undefined,
                notas: notas !== undefined ? notas : undefined,
                observaciones: observaciones !== undefined ? observaciones : undefined,
                updatedAt: new Date()
            };

            if (isDelivered) {
                dataToUpdate.fechaEntrega = new Date();
                dataToUpdate.fechaEntregaConfirmada = new Date();
                dataToUpdate.entregadoPorId = businessUserStaffId;
                if (staffId) {
                    dataToUpdate.staffId = staffId;
                }
            }

            const updatedRed = await (prisma as any).loyaltyRedemption.update({
                where: { id },
                data: dataToUpdate,
                include: {
                    Usuario: true,
                    Reward: true,
                    Staff: true
                }
            });

            // Enviar WhatsApp de notificación según estado
            if (updatedRed.Usuario?.phone) {
                try {
                    if (isDelivered) {
                        const staffName = updatedRed.Staff?.name ? ` por *${updatedRed.Staff.name}*` : "";
                        const msg = `🎁 *¡Premio de Lealtad Entregado!* 🎁\n\nHola *${updatedRed.Usuario.nombre}*,\n\nConfirmamos la entrega física de tu premio:\n🏆 *"${updatedRed.Reward.nombre}"* (Canjeado por ${updatedRed.Reward.costoPuntos} pts)\n🏢 En: *${loyaltyRedemption.Negocio.nombre}*${staffName}.\n\n¡Gracias por tu preferencia! Sigue acumulando puntos en cada cita. 🚀`;
                        await whatsappService.sendWhatsApp(updatedRed.Usuario.phone, msg, true, 'recompensa_entregada');
                    } else if (estado === 'LISTO_PARA_RETIRAR') {
                        const msg = `🎁 *¡Tu Premio está Listo para Retirar!* 🎁\n\nHola *${updatedRed.Usuario.nombre}*,\n\nTe informamos que tu premio:\n🏆 *"${updatedRed.Reward.nombre}"*\nya está preparado y listo para retirar en la recepción de *${loyaltyRedemption.Negocio.nombre}*. ¡Te esperamos! 🚀`;
                        await whatsappService.sendWhatsApp(updatedRed.Usuario.phone, msg, true, 'recompensa_lista');
                    }
                } catch (err) {
                    console.error("[Puntos] Error al enviar WhatsApp:", err);
                }
            }

            return NextResponse.json({
                ...updatedRed,
                tipoOrigen: "PUNTOS",
                Campaign: {
                    nombre: `Canje por puntos`,
                    valorRecompensa: updatedRed.Reward.nombre
                }
            });
        }

        // 2. Si no es canje de puntos, procesar como premio de referido tradicional
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

        const isDelivered = estado === "CANJEADO" || estado === "ENTREGADO";
        const finalState = estado ? (estado === "CANJEADO" ? "CANJEADO" : estado) : undefined;

        const dataToUpdate: any = {
            estado: finalState || undefined,
            notas: notas !== undefined ? notas : undefined,
            observaciones: observaciones !== undefined ? observaciones : undefined,
            updatedAt: new Date()
        };

        if (isDelivered) {
            dataToUpdate.fechaEntrega = new Date();
            dataToUpdate.fechaEntregaConfirmada = new Date();
            dataToUpdate.entregadoPorId = businessUserStaffId;
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

        // Enviar WhatsApp de notificación según estado
        if (updated.Usuario?.phone) {
            try {
                if (isDelivered) {
                    const staffName = updated.Staff?.name ? ` por *${updated.Staff.name}*` : "";
                    const msg = `🎁 *¡Premio Canjeado con Éxito!* 🎁\n\nHola *${updated.Usuario.nombre}*,\n\nConfirmamos la entrega de tu premio:\n🏆 *"${updated.Campaign.valorRecompensa}"*\n🏢 En: *${reward.Negocio.nombre}*${staffName}.\n\n¡Gracias por seguir recomendándonos! Sigue compartiendo tu enlace para ganar más premios. 🚀`;
                    await whatsappService.sendWhatsApp(updated.Usuario.phone, msg, true, 'recompensa_entregada');
                } else if (estado === 'LISTO_PARA_RETIRAR') {
                    const msg = `🎁 *¡Tu Premio está Listo para Retirar!* 🎁\n\nHola *${updated.Usuario.nombre}*,\n\nTe informamos que tu premio:\n🏆 *"${updated.Campaign.valorRecompensa}"*\nya está preparado y listo para retirar en la recepción de *${reward.Negocio.nombre}*. ¡Te esperamos! 🚀`;
                    await whatsappService.sendWhatsApp(updated.Usuario.phone, msg, true, 'recompensa_lista');
                }
            } catch (err) {
                console.error("[Referidos] Error al enviar WhatsApp:", err);
            }
        }

        return NextResponse.json({
            ...updated,
            tipoOrigen: "REFERIDO"
        });
    } catch (error: any) {
        console.error("Error updating reward status:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
