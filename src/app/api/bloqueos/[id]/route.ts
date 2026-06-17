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

        // Verificar que el bloqueo pertenezca al negocio
        const bloqueo = await prisma.bloqueo.findUnique({
            where: { id }
        });

        if (!bloqueo || bloqueo.negocioId !== negocioId) {
            return NextResponse.json({ error: 'Bloqueo no encontrado' }, { status: 404 });
        }

        await prisma.bloqueo.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting block:', error);
        return NextResponse.json({ error: 'Error al eliminar bloqueo' }, { status: 500 });
    }
}
