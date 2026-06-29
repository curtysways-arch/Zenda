'use server';

import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { notificationService } from '@/lib/notifications';

// Tipos requeridos
export type CreatePromotionInput = {
    titulo: string;
    descripcion: string;
    precioPromo: number;
    precioAnterior?: number;
    imagenUrl: string;
    imageMediaId?: string | null;
    fechaInicio: string;  // ISO string
    fechaFin: string;     // ISO string
    estado: string;
    serviceIds?: string[]; // IDs de los servicios seleccionados
    diasValidos?: string | null;
    horaInicioValida?: string | null;
    horaFinValida?: string | null;
    tipoPromo?: string | null;
};

// Obtener la sesión para admin
async function checkAuth() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("No autenticado");
    }
    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
        throw new Error("No tienes un negocio asignado");
    }
    return { session, negocioId };
}

export async function getPromotions() {
    const { negocioId } = await checkAuth();

    // 1. Buscar promociones activas que ya expiraron por fecha
    const expiredPromos = await prisma.promotion.findMany({
        where: {
            businessId: negocioId,
            estado: 'activa',
            fechaFin: { lt: new Date() }
        }
    });

    // 2. Si hay promociones expiradas, actualizarlas y notificar
    if (expiredPromos.length > 0) {
        console.log(`[PROMO] Expirando ${expiredPromos.length} promociones para negocio ${negocioId}`);
        
        // Obtener datos del negocio para la notificación
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { nombre: true, whatsapp: true }
        });

        for (const promo of expiredPromos) {
            await prisma.promotion.update({
                where: { id: promo.id },
                data: { estado: 'caducada' }
            });

            // Notificación Push
            await notificationService.sendPushToBusiness(
                negocioId,
                "Promoción Caducada",
                `La promoción "${promo.titulo}" ha finalizado.`
            );

            // Notificación WhatsApp (opcional, pero recomendada según el pedido del USER)
            if (negocio?.whatsapp) {
                try {
                    const waMessage = `✨ *Promoción Finalizada* 🧘‍♀️\n\nHola, te informamos que la promoción *"${promo.titulo}"* de *${negocio.nombre}* ha llegado a su fecha de fin y ya no está visible para el público.\n\n📅 *Finalizó:* ${new Date(promo.fechaFin).toLocaleString('es-ES')}\n\n📲 *Gestiona tus promociones aquí:* \n${process.env.NEXT_PUBLIC_APP_URL}/admin/promociones`;
                    
                    await notificationService.provider.sendMessage({
                        to: negocio.whatsapp.replace(/\D/g, ''),
                        message: waMessage,
                        template: 'promo_caducada'
                    });
                } catch (err) {
                    console.error("Error enviando WA de promo caducada:", err);
                }
            }
        }
    }

    const rawPromotions = await prisma.promotion.findMany({
        where: { businessId: negocioId },
        include: { 
            PromotionToService: { include: { Service: true } },
            imageMedia: true
        },
        orderBy: { createdAt: 'desc' },
    });

    const promotions = rawPromotions.map((p: any) => ({
        ...p,
        services: p.PromotionToService?.map((pts: any) => pts.Service) || []
    }));

    return promotions;
}

export async function createPromotion(data: CreatePromotionInput) {
    const { negocioId } = await checkAuth();

    try {
        const { serviceIds, ...restData } = data;
        const now = new Date();
        const promotion = await prisma.promotion.create({
            data: {
                id: crypto.randomUUID(),
                ...restData,
                imageMediaId: data.imageMediaId || null,
                businessId: negocioId,
                fechaInicio: new Date(data.fechaInicio),
                fechaFin: new Date(data.fechaFin),
                updatedAt: now,
                PromotionToService: serviceIds ? {
                    create: serviceIds.map(id => ({
                        Service: { connect: { id } }
                    }))
                } : undefined
            }
        });

        // Enviar notificación push al negocio
        await notificationService.sendPushToBusiness(
            negocioId,
            "Nueva Promoción",
            `Se ha publicado: ${promotion.titulo}`
        );

        revalidatePath('/admin/promociones');
        return { success: true, promotion };
    } catch (error: any) {
        console.error("Error al crear promoción:", error);
        return { success: false, error: error.message };
    }
}

export async function updatePromotion(id: string, data: Partial<CreatePromotionInput>) {
    const { negocioId } = await checkAuth();

    try {
        // Verificar propiedad
        const existing = await prisma.promotion.findUnique({ where: { id } });
        if (!existing || existing.businessId !== negocioId) {
            throw new Error("Promoción no encontrada o no pertenece a este negocio");
        }

        const { serviceIds, ...restData } = data;
        
        if (serviceIds) {
            await prisma.promotionToService.deleteMany({
                where: { A: id }
            });
        }

        const promotion = await prisma.promotion.update({
            where: { id },
            data: {
                updatedAt: new Date(),
                titulo: restData.titulo,
                descripcion: restData.descripcion,
                precioPromo: restData.precioPromo,
                precioAnterior: restData.precioAnterior,
                imagenUrl: restData.imagenUrl,
                imageMediaId: data.imageMediaId !== undefined ? data.imageMediaId : undefined,
                estado: restData.estado,
                diasValidos: restData.diasValidos,
                horaInicioValida: restData.horaInicioValida,
                horaFinValida: restData.horaFinValida,
                tipoPromo: restData.tipoPromo,
                fechaInicio: restData.fechaInicio ? new Date(restData.fechaInicio) : undefined,
                fechaFin: restData.fechaFin ? new Date(restData.fechaFin) : undefined,
                PromotionToService: serviceIds ? {
                    create: serviceIds.map(id => ({
                        Service: { connect: { id } }
                    }))
                } : undefined
            }
        });

        revalidatePath('/admin/promociones');
        return { success: true, promotion };
    } catch (error: any) {
        console.error("Error al actualizar promoción:", error);
        return { success: false, error: error.message };
    }
}

export async function deletePromotion(id: string) {
    const { negocioId } = await checkAuth();

    try {
        const existing = await prisma.promotion.findUnique({ where: { id } });
        if (!existing || existing.businessId !== negocioId) {
            throw new Error("Promoción no encontrada o no pertenece a este negocio");
        }

        await prisma.promotion.delete({ where: { id } });

        revalidatePath('/admin/promociones');
        return { success: true };
    } catch (error: any) {
        console.error("Error al eliminar promoción:", error);
        return { success: false, error: error.message };
    }
}
