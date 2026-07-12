import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { id } = await params;
        const reward = await (prisma as any).loyaltyReward.findUnique({
            where: { id }
        });

        if (!reward) return NextResponse.json({ error: "Premio no encontrado" }, { status: 404 });

        return NextResponse.json(reward);
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

        const updateData: any = {};
        if (nombre !== undefined) updateData.nombre = nombre;
        if (descripcion !== undefined) updateData.descripcion = descripcion || null;
        if (costoPuntos !== undefined) updateData.costoPuntos = parseInt(String(costoPuntos));
        if (tipo !== undefined) updateData.tipo = tipo;
        if (valor !== undefined) updateData.valor = valor ? String(valor) : null;
        if (cantidadTotal !== undefined) {
            updateData.cantidadTotal = cantidadTotal ? parseInt(String(cantidadTotal)) : null;
            // Si cambian el total, también reiniciamos el disponible a ese total por simplicidad
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

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { id } = await params;

        // Para evitar problemas de integridad de referential keys si ya fue canjeado,
        // simplemente lo desactivamos en lugar de borrarlo físicamente.
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
