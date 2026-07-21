import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ClubResolver } from "@/lib/growth/clubResolver";
import { InheritanceResource } from "@prisma/client";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/club/customize
 *
 * Implementa el patrón Copy-On-Write.
 * Cuando el negocio quiere personalizar un recurso global:
 *   1. Crea una copia local del recurso global.
 *   2. Guarda el customId en BusinessInheritance.
 *   3. Cambia mode a CUSTOMIZED.
 *
 * El recurso global NUNCA se modifica.
 *
 * Body: {
 *   resourceType: InheritanceResource,
 *   resourceId: string,     // ID del recurso global a personalizar
 *   customData: object      // Datos del recurso local personalizado
 * }
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });
        const body = await req.json();
        const { resourceType, resourceId } = body;
        if (!resourceType || !resourceId) {
            return NextResponse.json({ error: "resourceType y resourceId son obligatorios" }, { status: 400 });
        }

        const customData = body.customData || {};

        if (!Object.values(InheritanceResource).includes(resourceType)) {
            return NextResponse.json({ error: "resourceType inválido" }, { status: 400 });
        }

        let customId: string;

        // ─── Copy-On-Write por tipo de recurso ───────────────────────────────
        if (resourceType === InheritanceResource.GLOBAL_LEVEL) {
            // Buscar el GlobalLevel base para copiar sus valores
            const globalLevel = await prisma.globalLevel.findUnique({ where: { id: resourceId } });
            if (!globalLevel) return NextResponse.json({ error: "GlobalLevel no encontrado" }, { status: 404 });

            // Verificar si ya existe un LoyaltyLevel personalizado para este negocio/global
            const existingInheritance = await prisma.businessInheritance.findUnique({
                where: { negocioId_resourceType_resourceId: { negocioId, resourceType, resourceId } },
            });
            if (existingInheritance?.customId) {
                // Ya tiene uno personalizado — solo actualizar los datos
                const updated = await prisma.loyaltyLevel.update({
                    where: { id: existingInheritance.customId },
                    data: {
                        nombre: customData.nombre ?? globalLevel.nombre,
                        diamantesRequeridos: customData.diamantesRequeridos ?? 0,
                        color: customData.color ?? '#4f46e5',
                        icono: customData.icono ?? 'Award',
                        orden: customData.orden ?? globalLevel.orden,
                        beneficios: customData.beneficios ?? null,
                        recompensaTipo: customData.recompensaTipo ?? null,
                        recompensaValor: customData.recompensaValor ?? null,
                        multiplicador: customData.multiplicador ?? 1.0,
                    },
                });
                customId = updated.id;
            } else {
                // Crear LoyaltyLevel local como copia personalizada
                const local = await prisma.loyaltyLevel.create({
                    data: {
                        id: crypto.randomUUID(),
                        negocioId,
                        nombre: customData.nombre ?? globalLevel.nombre,
                        diamantesRequeridos: customData.diamantesRequeridos ?? 0,
                        color: customData.color ?? '#4f46e5',
                        icono: customData.icono ?? 'Award',
                        orden: customData.orden ?? globalLevel.orden,
                        beneficios: customData.beneficios ?? null,
                        recompensaTipo: customData.recompensaTipo ?? null,
                        recompensaValor: customData.recompensaValor ?? null,
                        multiplicador: customData.multiplicador ?? 1.0,
                    },
                });
                customId = local.id;
            }

        } else if (resourceType === InheritanceResource.GLOBAL_SEASON) {
            // Buscar la GlobalSeason base
            const globalSeason = await prisma.globalSeason.findUnique({ where: { id: resourceId } });
            if (!globalSeason) return NextResponse.json({ error: "GlobalSeason no encontrada" }, { status: 404 });

            const existingInheritance = await prisma.businessInheritance.findUnique({
                where: { negocioId_resourceType_resourceId: { negocioId, resourceType, resourceId } },
            });
            if (existingInheritance?.customId) {
                // Actualizar LoyaltySeason existente
                const updated = await prisma.loyaltySeason.update({
                    where: { id: existingInheritance.customId },
                    data: {
                        duracionMeses: customData.duracionMeses ?? 3,
                        descuentoDiamantes: customData.descuentoDiamantes ?? 0,
                    },
                });
                customId = updated.id;
            } else {
                // Crear LoyaltySeason local
                const local = await prisma.loyaltySeason.create({
                    data: {
                        id: crypto.randomUUID(),
                        negocioId,
                        fechaInicio: customData.fechaInicio ? new Date(customData.fechaInicio) : new Date(globalSeason.fechaInicio),
                        fechaFin: customData.fechaFin ? new Date(customData.fechaFin) : new Date(globalSeason.fechaFin),
                        duracionMeses: customData.duracionMeses ?? 3,
                        descuentoDiamantes: customData.descuentoDiamantes ?? 0,
                        activa: true,
                        procesada: false,
                    },
                });
                customId = local.id;
            }

        } else if (resourceType === InheritanceResource.REWARD) {
            // Para premios, el customId apunta a un LoyaltyReward local
            const globalReward = await prisma.rewardCatalog.findUnique({ where: { id: resourceId } });
            if (!globalReward) return NextResponse.json({ error: "RewardCatalog no encontrado" }, { status: 404 });

            const existingInheritance = await prisma.businessInheritance.findUnique({
                where: { negocioId_resourceType_resourceId: { negocioId, resourceType, resourceId } },
            });
            if (existingInheritance?.customId) {
                const updated = await prisma.loyaltyReward.update({
                    where: { id: existingInheritance.customId },
                    data: {
                        nombre: customData.nombre ?? globalReward.nombre,
                        descripcion: customData.descripcion ?? globalReward.descripcion ?? '',
                        tipo: customData.tipo ?? 'PERSONALIZADO',
                        costoPuntos: customData.costoPuntos ?? 0,
                        activa: customData.activa ?? true,
                    },
                });
                customId = updated.id;
            } else {
                const local = await prisma.loyaltyReward.create({
                    data: {
                        id: crypto.randomUUID(),
                        negocioId,
                        nombre: customData.nombre ?? globalReward.nombre,
                        descripcion: customData.descripcion ?? globalReward.descripcion ?? '',
                        tipo: customData.tipo ?? 'PERSONALIZADO',
                        costoPuntos: customData.costoPuntos ?? 0,
                        activa: customData.activa ?? true,
                    },
                });
                customId = local.id;
            }

        } else if (resourceType === InheritanceResource.COUPON_TEMPLATE) {
            // Para cupones, el customId apunta a un Coupon local
            const template = await prisma.couponTemplate.findUnique({ where: { id: resourceId } });
            if (!template) return NextResponse.json({ error: "CouponTemplate no encontrado" }, { status: 404 });

            const existingInheritance = await prisma.businessInheritance.findUnique({
                where: { negocioId_resourceType_resourceId: { negocioId, resourceType, resourceId } },
            });
            if (existingInheritance?.customId) {
                const updated = await prisma.coupon.update({
                    where: { id: existingInheritance.customId },
                    data: {
                        descripcion: customData.descripcion ?? template.descripcion,
                        valor: customData.valor ?? 0,
                        tipo: customData.tipo ?? 'PORCENTAJE',
                        activa: customData.activa ?? true,
                    },
                });
                customId = updated.id;
            } else {
                const local = await prisma.coupon.create({
                    data: {
                        id: crypto.randomUUID(),
                        negocioId,
                        descripcion: customData.descripcion ?? template.descripcion,
                        codigo: customData.codigo ?? `CUSTOM-${Date.now()}`,
                        valor: customData.valor ?? 0,
                        tipo: customData.tipo ?? 'PORCENTAJE',
                        activa: customData.activa ?? true,
                    },
                });
                customId = local.id;
            }

        } else {
            return NextResponse.json({ error: "resourceType no soportado para personalización" }, { status: 400 });
        }

        // Registrar el modo CUSTOMIZED con el customId
        const result = await ClubResolver.setCustomized(negocioId, resourceType as InheritanceResource, resourceId, customId);

        return NextResponse.json({ success: true, customId, data: result });

    } catch (error: any) {
        console.error("[POST /api/admin/club/customize] Error:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
