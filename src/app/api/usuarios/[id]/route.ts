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
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const negocioId = (session.user as any).negocioId;
        const currentUserId = (session.user as any).id;

        if (id === currentUserId) {
            return NextResponse.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 });
        }

        const userToDelete = await prisma.usuario.findUnique({
            where: { id }
        });

        if (!userToDelete || userToDelete.negocioId !== negocioId) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        await prisma.usuario.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
    }
}
