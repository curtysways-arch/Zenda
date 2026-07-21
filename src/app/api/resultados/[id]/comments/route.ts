
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

// Obtener comentarios de un resultado
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: resultadoId } = await params;
        
        const comments = await prisma.commentResultado.findMany({
            where: {
                resultadoId: resultadoId,
                approved: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(comments);
    } catch (error: any) {
        console.error('Error fetching comments:', error);
        return NextResponse.json({ error: 'Error al obtener comentarios' }, { status: 500 });
    }
}

// Crear un nuevo comentario
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: resultadoId } = await params;
        
        let userName = 'Usuario';
        let userAvatar: string | null = null;
        let userId: string | null = null;
        let isAuthenticated = false;

        // 1. Intentar con cookie de sesión del Cliente (OTP WhatsApp)
        const cookieStore = await cookies();
        const token = cookieStore.get("customer_token")?.value;

        if (token) {
            try {
                const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
                const verification = await jwtVerify(token, secret);
                const payload = verification.payload;

                const telefono = payload.telefono as string;
                const negocioId = payload.negocioId as string;

                // Variaciones del teléfono para máxima compatibilidad
                const localTelefono = telefono.replace(/^\+(\d{1,4})/, "");
                const digitsOnly = telefono.replace(/\D/g, "");
                const localNoZero = localTelefono.replace(/^0+/, "");

                // Buscar al cliente en la DB
                const cliente = await prisma.cliente.findFirst({
                    where: {
                        negocioId: negocioId,
                        OR: [
                            { telefono: telefono },
                            { telefono: localTelefono },
                            { telefono: digitsOnly },
                            { telefono: { endsWith: localNoZero } }
                        ]
                    }
                });

                if (cliente) {
                    userName = cliente.nombre || "Cliente";
                    userAvatar = cliente.imagenUrl || null;
                    userId = cliente.id;
                } else {
                    userName = "Cliente";
                    userId = telefono;
                }
                isAuthenticated = true;
            } catch (e) {
                console.error('Error verifying customer_token in comment route:', e);
            }
        }

        // 2. Intentar con sesión de Next-Auth (Administradores / Colaboradores) como último recurso
        if (!isAuthenticated) {
            const session = await getServerSession(authOptions);
            if (session && session.user) {
                userName = session.user.name || 'Usuario';
                userAvatar = session.user.image || null;
                userId = (session.user as any).id || null;
                isAuthenticated = true;
            }
        }

        if (!isAuthenticated) {
            return NextResponse.json({ error: 'Debes iniciar sesión con tu teléfono o cuenta para comentar' }, { status: 401 });
        }

        const { content } = await req.json();
        if (!content || !content.trim()) {
            return NextResponse.json({ error: 'Contenido de comentario vacío o inválido' }, { status: 400 });
        }

        const commentId = Math.random().toString(36).substring(2, 15);

        await prisma.commentResultado.create({
            data: {
                id: commentId,
                resultadoId,
                userName,
                userAvatar,
                content,
                approved: true,
                createdAt: new Date(),
                userId
            }
        });

        return NextResponse.json({
            id: commentId,
            resultadoId,
            userName,
            userAvatar,
            content,
            approved: true,
            createdAt: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Error creating comment:', error);
        return NextResponse.json({ error: 'Error al crear comentario', details: error.message }, { status: 500 });
    }
}
