import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { ClubResolver } from "@/lib/growth/clubResolver";

export async function GET(
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

        // 1. Buscar si existe el premio en la tabla local del negocio
        const reward = await (prisma as any).loyaltyReward.findUnique({
            where: { id }
        });

        if (reward) return NextResponse.json(reward);

        // 2. Si no es local, buscar si es un RewardCatalog global
        const globalReward = await prisma.rewardCatalog.findUnique({
            where: { id }
        });

        if (globalReward) {
            // Verificar si el negocio tiene un registro de herencia personalizado para este premio
            const inheritance = await prisma.businessInheritance.findUnique({
                where: {
                    negocioId_resourceType_resourceId: {
                        negocioId,
                        resourceType: "REWARD",
                        resourceId: id
                    }
                }
            });

            if (inheritance?.mode === 'CUSTOMIZED' && inheritance.customId) {
                const localReward = await prisma.loyaltyReward.findUnique({
                    where: { id: inheritance.customId }
                });
                if (localReward) return NextResponse.json(localReward);
            }

            // Devolver el premio global formateado a la estructura local que espera el frontend
            return NextResponse.json({
                id: globalReward.id,
                negocioId,
                nombre: globalReward.nombre,
                descripcion: globalReward.descripcion,
                imagenUrl: (globalReward.config as any)?.imagenUrl ?? null,
                recompensaImagenUrl: null,
                costoPuntos: (globalReward.config as any)?.costoPuntos ?? 0,
                tipo: globalReward.tipo,
                deliveryType: "AUTOMATICO",
                valor: (globalReward.config as any)?.valor ? String((globalReward.config as any)?.valor) : null,
                serviceId: (globalReward.config as any)?.serviceId ?? null,
                couponId: (globalReward.config as any)?.couponId ?? null,
                activa: globalReward.activo,
                isGlobal: true,
                mode: inheritance?.mode ?? 'INHERITED'
            });
        }

        return NextResponse.json({ error: "Premio no encontrado" }, { status: 404 });
    } catch (error: any) {
        console.error("Error fetching loyalty reward:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

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

        const {
            nombre,
            descripcion,
            costoPuntos,
            tipo,
            valor,
            cantidadTotal,
            imagenUrl,
            recompensaImagenUrl,
            couponId,
            deliveryType,
            serviceId,
            activa
        } = body;

        // 1. Verificar si el premio es local
        const localRewardExists = await (prisma as any).loyaltyReward.findUnique({
            where: { id }
        });

        if (!localRewardExists) {
            // Es un premio global heredado. Implementamos Copy-On-Write (personalizar premio).
            const globalReward = await prisma.rewardCatalog.findUnique({
                where: { id }
            });
            if (!globalReward) return NextResponse.json({ error: "Premio no encontrado" }, { status: 404 });

            const customId = crypto.randomUUID();
            const createdLocal = await (prisma as any).loyaltyReward.create({
                data: {
                    id: customId,
                    negocioId,
                    nombre: nombre !== undefined ? nombre : globalReward.nombre,
                    descripcion: descripcion !== undefined ? descripcion : (globalReward.descripcion || null),
                    imagenUrl: imagenUrl !== undefined ? imagenUrl : ((globalReward.config as any)?.imagenUrl || null),
                    recompensaImagenUrl: recompensaImagenUrl !== undefined ? recompensaImagenUrl : null,
                    costoPuntos: costoPuntos !== undefined ? parseInt(String(costoPuntos)) : ((globalReward.config as any)?.costoPuntos ?? 0),
                    tipo: tipo !== undefined ? tipo : globalReward.tipo,
                    deliveryType: deliveryType !== undefined ? deliveryType : 'AUTOMATICO',
                    valor: valor !== undefined ? (valor ? String(valor) : null) : ((globalReward.config as any)?.valor ? String((globalReward.config as any)?.valor) : null),
                    serviceId: serviceId !== undefined ? serviceId : ((globalReward.config as any)?.serviceId || null),
                    couponId: couponId !== undefined ? couponId : ((globalReward.config as any)?.couponId || null),
                    cantidadTotal: cantidadTotal !== undefined ? (cantidadTotal ? parseInt(String(cantidadTotal)) : null) : null,
                    cantidadDisponible: cantidadTotal !== undefined ? (cantidadTotal ? parseInt(String(cantidadTotal)) : null) : null,
                    activa: activa !== undefined ? !!activa : true
                }
            });

            // Registrar el CUSTOMIZED en BusinessInheritance
            await ClubResolver.setCustomized(negocioId, "REWARD", id, customId);

            return NextResponse.json(createdLocal);
        }

        // 2. Es premio local: actualizar directamente
        const updateData: any = {};
        if (nombre !== undefined) updateData.nombre = nombre;
        if (descripcion !== undefined) updateData.descripcion = descripcion || null;
        if (costoPuntos !== undefined) updateData.costoPuntos = parseInt(String(costoPuntos));
        if (tipo !== undefined) updateData.tipo = tipo;
        if (valor !== undefined) updateData.valor = valor ? String(valor) : null;
        if (cantidadTotal !== undefined) {
            updateData.cantidadTotal = cantidadTotal ? parseInt(String(cantidadTotal)) : null;
            updateData.cantidadDisponible = cantidadTotal ? parseInt(String(cantidadTotal)) : null;
        }
        if (imagenUrl !== undefined) updateData.imagenUrl = imagenUrl || null;
        if (recompensaImagenUrl !== undefined) updateData.recompensaImagenUrl = recompensaImagenUrl || null;
        if (couponId !== undefined) updateData.couponId = couponId || null;
        if (deliveryType !== undefined) updateData.deliveryType = deliveryType;
        if (serviceId !== undefined) updateData.serviceId = serviceId || null;
        if (activa !== undefined) updateData.activa = !!activa;

        const updated = await (prisma as any).loyaltyReward.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Error updating loyalty reward:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

export const PUT = PATCH;

export async function DELETE(
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

        // 1. Verificar si el premio es local
        const localRewardExists = await (prisma as any).loyaltyReward.findUnique({
            where: { id }
        });

        if (!localRewardExists) {
            // Si es global, simplemente lo deshabilitamos (mode = DISABLED)
            await ClubResolver.disableResource(negocioId, "REWARD", id);
            return NextResponse.json({ success: true, mode: 'DISABLED' });
        }

        // 2. Si es local, desactivar (soft delete)
        const deleted = await (prisma as any).loyaltyReward.update({
            where: { id },
            data: { activa: false }
        });

        return NextResponse.json({ success: true, reward: deleted });
    } catch (error: any) {
        console.error("Error deleting loyalty reward:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
