import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

async function getAuthInfo() {
    // 1. Intentar obtener sesión de NextAuth (para Admins/Staff)
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.id) {
        return {
            userId: (session.user as any).id,
            userName: (session.user as any).name || 'Admin',
            userAvatar: (session.user as any).image || null,
            isAdmin: (session.user as any).role === 'ADMIN' || (session.user as any).role === 'SUPERADMIN' || (session.user as any).role === 'ADMIN_NEGOCIO',
            negocioId: (session.user as any).negocioId
        };
    }

    // 2. Intentar obtener sesión de Cliente (OTP / customer_token)
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("customer_token")?.value;
        if (token) {
            const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
            const { payload } = await jwtVerify(token, secret);
            
            // Buscar nombre del cliente en la DB si es posible
            const cliente = await prisma.cliente.findFirst({
                where: { telefono: payload.telefono as string }
            });

            return {
                userId: (payload.userId as string) || (payload.telefono as string), // Usar teléfono como ID si no hay usuario vinculado
                userName: cliente?.nombre || 'Cliente',
                userAvatar: null,
                isAdmin: false
            };
        }
    } catch (e) {
        console.error("Error verifying customer_token:", e);
    }

    return null;
}

export async function POST(req: Request) {
    try {
        const auth = await getAuthInfo();
        const { resultadoId, action, userName, userAvatar, content } = await req.json();

        if (action === 'like') {
            if (!auth) return NextResponse.json({ error: 'Login requerido' }, { status: 401 });

            // Verificar si ya existe el like para este usuario
            const existingLike: any[] = await prisma.$queryRawUnsafe(`
                SELECT id FROM LikeResultado WHERE resultadoId = ? AND userId = ?
            `, resultadoId, auth.userId);

            if (existingLike.length > 0) {
                // Si ya existe, lo eliminamos (Toggle)
                await prisma.$executeRawUnsafe(`
                    DELETE FROM LikeResultado WHERE resultadoId = ? AND userId = ?
                `, resultadoId, auth.userId);
                return NextResponse.json({ success: true, action: 'unliked' });
            }

            const id = Math.random().toString(36).substring(2, 15);
            await prisma.$executeRawUnsafe(`
                INSERT INTO LikeResultado (id, resultadoId, userId, createdAt)
                VALUES (?, ?, ?, ?)
            `, id, resultadoId, auth.userId, new Date().toISOString());
            
            return NextResponse.json({ success: true, action: 'liked' });
        }

        if (action === 'comment') {
            if (!auth) return NextResponse.json({ error: 'Login requerido' }, { status: 401 });

            const id = Math.random().toString(36).substring(2, 15);
            
            await prisma.commentResultado.create({
                data: {
                    id,
                    resultadoId,
                    userId: auth.userId,
                    userName: auth.userName,
                    userAvatar: auth.userAvatar,
                    content,
                    approved: true,
                    createdAt: new Date()
                }
            });

            return NextResponse.json({ success: true, message: 'Comentario publicado' });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (error) {
        console.error('Error in social API:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const auth = await getAuthInfo();
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const commentId = searchParams.get('id');

        if (!commentId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

        // Obtener el comentario para verificar propiedad o si es admin del negocio
        const comment = await prisma.commentResultado.findUnique({
            where: { id: commentId },
            include: {
                Resultado: {
                    select: { businessId: true }
                }
            }
        });

        if (!comment) {
            return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
        }

        const isOwner = comment.userId === auth.userId;
        const isAdminOfBusiness = auth.isAdmin && auth.negocioId === comment.Resultado.businessId;
        const isSuperAdmin = (auth as any).role === 'SUPERADMIN'; // O verificar roles si es necesario

        if (!isOwner && !isAdminOfBusiness && !isSuperAdmin) {
            return NextResponse.json({ error: 'No permitido' }, { status: 403 });
        }

        await prisma.commentResultado.delete({
            where: { id: commentId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const auth = await getAuthInfo();
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { commentId, content } = await req.json();

        if (!commentId || !content) {
            return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        // Obtener el comentario para verificar propiedad
        const comment = await prisma.commentResultado.findUnique({
            where: { id: commentId },
            select: { userId: true }
        });

        if (!comment) {
            return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
        }

        if (comment.userId !== auth.userId) {
            return NextResponse.json({ error: 'No permitido' }, { status: 403 });
        }

        await prisma.commentResultado.update({
            where: { id: commentId },
            data: { content }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const resultadoId = searchParams.get('resultadoId');
    const auth = await getAuthInfo();

    if (!resultadoId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    try {
        const comments = await prisma.commentResultado.findMany({
            where: {
                resultadoId: resultadoId,
                approved: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const likesCount = await prisma.likeResultado.count({
            where: { resultadoId }
        });

        let userHasLiked = false;
        if (auth) {
            const userLike = await prisma.likeResultado.findFirst({
                where: { resultadoId, userId: auth.userId }
            });
            userHasLiked = !!userLike;
        }

        return NextResponse.json({ 
            comments, 
            likesCount: Number(likesCount[0]?.count || 0),
            userHasLiked
        });
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener datos sociales' }, { status: 500 });
    }
}
