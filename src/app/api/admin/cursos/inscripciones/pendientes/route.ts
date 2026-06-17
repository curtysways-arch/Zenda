import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const negocioId = (session?.user as any)?.negocioId;
        if (!negocioId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const count = await (prisma as any).courseEnrollment.count({
            where: {
                status: 'pending',
                course: {
                    businessId: negocioId
                }
            }
        });

        return NextResponse.json({ count });
    } catch (error) {
        console.error('Error fetching pending enrollments count:', error);
        return NextResponse.json({ error: 'Error al obtener conteo' }, { status: 500 });
    }
}
