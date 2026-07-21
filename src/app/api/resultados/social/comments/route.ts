
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;

        // Fetch all comments for results of this business using Prisma
        const rawComments = await prisma.commentResultado.findMany({
            where: {
                Resultado: {
                    businessId: negocioId
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                Resultado: {
                    select: {
                        title: true,
                        afterImage: true
                    }
                }
            }
        });

        const comments = rawComments.map(c => ({
            id: c.id,
            resultadoId: c.resultadoId,
            userName: c.userName,
            userAvatar: c.userAvatar,
            content: c.content,
            approved: c.approved,
            createdAt: c.createdAt,
            userId: c.userId,
            post_title: c.Resultado.title,
            post_image: c.Resultado.afterImage
        }));

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

        await prisma.commentResultado.update({
            where: { id },
            data: { approved: !!approved }
        });

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

        if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

        await prisma.commentResultado.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error al eliminar comentario' }, { status: 500 });
    }
}
