import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { token, device } = await req.json();

        if (!token) {
            return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
        }

        // Obtener usuario
        const usuario = await prisma.usuario.findUnique({
            where: { email: session.user.email as string }
        });

        if (!usuario) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        // Upsert el token para evitar duplicados y actualizar datos si cambian
        await prisma.pushToken.upsert({
            where: { token },
            update: {
                userId: usuario.id,
                businessId: usuario.negocioId,
                device: device || 'unknown',
            },
            create: {
                token,
                userId: usuario.id,
                businessId: usuario.negocioId,
                device: device || 'unknown',
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error al registrar token push:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
