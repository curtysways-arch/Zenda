import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;

        const imagen = await prisma.imagen.findUnique({
            where: { id }
        });

        if (!imagen || imagen.negocioId !== negocioId) {
            return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 });
        }

        await prisma.imagen.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting image:', error);
        return NextResponse.json({ error: 'Error al eliminar imagen' }, { status: 500 });
    }
}
