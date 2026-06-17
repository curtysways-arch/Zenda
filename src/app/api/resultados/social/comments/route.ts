
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;

        // Fetch all comments for results of this business
        const comments = await prisma.$queryRawUnsafe(`
            SELECT c.*, r.title as post_title, r.afterImage as post_image
            FROM CommentResultado c
            JOIN Resultado r ON c.resultadoId = r.id
            WHERE r.businessId = ?
            ORDER BY c.createdAt DESC
        `, negocioId);

        return NextResponse.json(comments);
    } catch (error) {
        console.error('Error fetching admin comments:', error);
        return NextResponse.json({ error: 'Error al obtener comentarios' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { id, approved } = await req.json();

        await prisma.$executeRawUnsafe(`
            UPDATE CommentResultado SET approved = ? WHERE id = ?
        `, approved ? 1 : 0, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error al actualizar comentario' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        await prisma.$executeRawUnsafe(`
            DELETE FROM CommentResultado WHERE id = ?
        `, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error al eliminar comentario' }, { status: 500 });
    }
}
