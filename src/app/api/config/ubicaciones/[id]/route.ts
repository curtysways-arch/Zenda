import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getNegocioId() {
    const session = await getServerSession(authOptions);
    return (session?.user as any)?.negocioId;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const negocioId = await getNegocioId();
    if (!negocioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const { nombre, direccion, mapUrl } = await req.json();

    try {
        const now = new Date().toISOString();
        const dir = direccion?.trim() || null;
        const map = mapUrl?.trim() || null;
        await prisma.$executeRawUnsafe(
            `UPDATE Ubicacion SET nombre = ?, direccion = ?, mapUrl = ?, updatedAt = ? WHERE id = ? AND negocioId = ?`,
            nombre?.trim(), dir, map, now, id, negocioId
        );
        return NextResponse.json({ id, nombre: nombre?.trim(), direccion: dir, mapUrl: map });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const negocioId = await getNegocioId();
    if (!negocioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;

    try {
        // Desasociar canchas antes de eliminar
        await prisma.$executeRawUnsafe(
            `UPDATE Cancha SET ubicacionId = NULL WHERE ubicacionId = ? AND negocioId = ?`,
            id, negocioId
        );
        await prisma.$executeRawUnsafe(
            `DELETE FROM Ubicacion WHERE id = ? AND negocioId = ?`,
            id, negocioId
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
    }
}
