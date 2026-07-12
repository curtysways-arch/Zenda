import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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

        // Eliminar recompensa del catálogo
        await (prisma as any).loyaltyReward.delete({
            where: { id, negocioId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting loyalty reward:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

export async function PUT(
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
        const { nombre, descripcion, costoPuntos, tipo, valor, cantidadTotal, imagenUrl, activa, couponId } = body;

        if (!nombre || costoPuntos === undefined || !tipo) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        const updatedReward = await (prisma as any).loyaltyReward.update({
            where: { id, negocioId },
            data: {
                nombre,
                descripcion: descripcion || null,
                imagenUrl: imagenUrl || null,
                costoPuntos: parseInt(String(costoPuntos)),
                tipo,
                valor: valor ? String(valor) : null,
                couponId: couponId ? String(couponId) : null,
                cantidadTotal: cantidadTotal ? parseInt(String(cantidadTotal)) : null,
                activa: activa !== undefined ? Boolean(activa) : true
            }
        });

        return NextResponse.json({ success: true, reward: updatedReward });
    } catch (error: any) {
        console.error("Error updating loyalty reward:", error);
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
        const { activa } = body;

        if (activa === undefined) {
            return NextResponse.json({ error: "Falta campo activa" }, { status: 400 });
        }

        const updatedReward = await (prisma as any).loyaltyReward.update({
            where: { id, negocioId },
            data: {
                activa: Boolean(activa)
            }
        });

        return NextResponse.json({ success: true, reward: updatedReward });
    } catch (error: any) {
        console.error("Error toggling loyalty reward:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
