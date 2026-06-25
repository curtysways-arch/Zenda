import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
    console.log('[FCM API] Recibida petición de registro de token push');
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            console.warn('[FCM API] Petición rechazada: No hay sesión válida');
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { token, device } = await req.json();

        if (!token) {
            console.warn('[FCM API] Petición rechazada: Token vacío');
            return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
        }

        console.log('[FCM API] Sesión de usuario activa:', session.user.email);

        // Obtener usuario
        const usuario = await prisma.usuario.findUnique({
            where: { email: session.user.email as string }
        });

        if (!usuario) {
            console.warn('[FCM API] Petición rechazada: Usuario no encontrado en tabla Usuario para email:', session.user.email);
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        // Upsert el token para evitar duplicados y actualizar datos si cambian
        const pushToken = await prisma.pushToken.upsert({
            where: { token },
            update: {
                userId: usuario.id,
                businessId: usuario.negocioId,
                device: device || 'unknown',
            },
            create: {
                id: crypto.randomUUID(),
                token,
                userId: usuario.id,
                businessId: usuario.negocioId,
                device: device || 'unknown',
            },
        });

        console.log('[FCM API] Token registrado exitosamente:', {
            tokenId: pushToken.id,
            userId: usuario.id,
            businessId: usuario.negocioId,
            tokenPrefix: token.substring(0, 15)
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[FCM API] Error al registrar token push:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
