import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

// GET /api/admin/loyalty/rewards — Listar premios unificados
import { ClubResolver } from "@/lib/growth/clubResolver";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const resolved = await ClubResolver.resolveRewards(negocioId);
        const rewards = resolved.map(r => {
            if (r.source === 'LOCAL') {
                return {
                    ...r.data,
                    isGlobal: false,
                    mode: r.mode
                };
            } else {
                // Mapear RewardCatalog a la estructura esperada de LoyaltyReward
                return {
                    id: r.data.id,
                    negocioId,
                    nombre: r.data.nombre,
                    descripcion: r.data.descripcion ?? '',
                    imagenUrl: r.data.config?.imagenUrl ?? null,
                    recompensaImagenUrl: null,
                    costoPuntos: r.data.config?.costoPuntos ?? 0,
                    tipo: r.data.tipo, // RewardCatalogType es compatible con RewardType
                    deliveryType: 'AUTOMATICO',
                    valor: r.data.config?.valor ? String(r.data.config?.valor) : null,
                    serviceId: r.data.config?.serviceId ?? null,
                    couponId: r.data.config?.couponId ?? null,
                    cantidadTotal: null,
                    cantidadDisponible: null,
                    activa: r.data.activo ?? true,
                    isGlobal: true,
                    mode: r.mode,
                    resourceId: r.resourceId
                };
            }
        });

        return NextResponse.json(rewards);
    } catch (error: any) {
        console.error("Error fetching loyalty rewards:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const body = await req.json();
        const { nombre, descripcion, costoPuntos, tipo, valor, cantidadTotal, imagenUrl, couponId, deliveryType, serviceId, recompensaImagenUrl } = body;

        if (!nombre || costoPuntos === undefined || !tipo) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        const newReward = await (prisma as any).loyaltyReward.create({
            data: {
                id: crypto.randomUUID(),
                negocioId,
                nombre,
                descripcion: descripcion || null,
                imagenUrl: imagenUrl || null,
                recompensaImagenUrl: recompensaImagenUrl || null,
                costoPuntos: parseInt(String(costoPuntos)),
                tipo,
                deliveryType: deliveryType || 'AUTOMATICO',
                valor: valor ? String(valor) : null,
                serviceId: serviceId || null,
                couponId: couponId ? String(couponId) : null,
                cantidadTotal: cantidadTotal ? parseInt(String(cantidadTotal)) : null,
                cantidadDisponible: cantidadTotal ? parseInt(String(cantidadTotal)) : null,
                activa: true
            }
        });

        return NextResponse.json(newReward);
    } catch (error: any) {
        console.error("Error creating loyalty reward:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
