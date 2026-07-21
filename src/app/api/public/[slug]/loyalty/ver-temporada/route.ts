import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const resolvedParams = await params;
        const slug = resolvedParams.slug;

        const negocio = await prisma.negocio.findUnique({
            where: { slug }
        });
        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        let userId: string | undefined = undefined;

        // Intentar obtener de cookies de cliente (OTP)
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const token = cookieStore.get("customer_token")?.value;

        if (token) {
            try {
                const { jwtVerify } = await import('jose');
                const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
                const verification = await jwtVerify(token, secret);
                const payload = verification.payload;
                const phone = payload.telefono as string;

                const localTelefono = phone.replace(/^\+(\d{1,4})/, ''); 
                const digitsOnly = phone.replace(/\D/g, ''); 
                const localNoZero = localTelefono.replace(/^0+/, '');

                const user = await prisma.usuario.findFirst({
                    where: {
                        OR: [
                            { phone: phone },
                            { phone: localTelefono },
                            { phone: digitsOnly },
                            { phone: { endsWith: localNoZero } }
                        ]
                    }
                });
                if (user) userId = user.id;
            } catch (e) {
                console.error("Error verifying customer_token:", e);
            }
        }

        if (!userId) {
            const session = await getServerSession(authOptions);
            userId = (session?.user as any)?.id;
        }

        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener temporada activa
        const activeSeason = await prisma.loyaltySeason.findFirst({
            where: { negocioId: negocio.id, activa: true },
            orderBy: { createdAt: 'desc' }
        });

        if (activeSeason) {
            const userPoints = await prisma.userPoints.findUnique({
                where: { userId_negocioId: { userId, negocioId: negocio.id } }
            });

            if (userPoints) {
                await prisma.userPoints.update({
                    where: { id: userPoints.id },
                    data: { ultimaTemporadaVistaId: activeSeason.id }
                });
            }
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
