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
    
    try {
        const { nombre, direccion, mapUrl } = await req.json();
        if (!nombre?.trim()) {
            return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
        }

        // Verificar unicidad con otra sede distinta
        const existing = await prisma.ubicacion.findFirst({
            where: {
                nombre: nombre.trim(),
                negocioId,
                NOT: { id }
            }
        });
        if (existing) {
            return NextResponse.json({ error: "Ya existe otra sede con ese nombre" }, { status: 400 });
        }

        const updated = await prisma.ubicacion.update({
            where: { id, negocioId },
            data: {
                nombre: nombre.trim(),
                direccion: direccion?.trim() || null,
                mapUrl: mapUrl?.trim() || null,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('[PATCH /api/config/ubicaciones/[id]] Error:', error);
        return NextResponse.json({ error: "Error al actualizar la ubicación: " + (error?.message || 'Error desconocido') }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const negocioId = await getNegocioId();
    if (!negocioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;

    try {
        // Desasociar servicios (canchas) antes de eliminar la sede
        await prisma.service.updateMany({
            where: { ubicacionId: id, negocioId },
            data: { ubicacionId: null }
        });

        // Eliminar de la base de datos
        await prisma.ubicacion.delete({
            where: { id, negocioId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[DELETE /api/config/ubicaciones/[id]] Error:', error);
        return NextResponse.json({ error: "Error al eliminar la ubicación: " + (error?.message || 'Error desconocido') }, { status: 500 });
    }
}
