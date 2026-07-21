import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * Retorna la biblioteca global de plantillas de misiones del SuperAdmin (Marketplace).
 */
export async function GET() {
    try {
        // 1. Validar autenticación de administrador
        const session = await getServerSession(authOptions);
        
        if (!(session?.user as any)?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener las plantillas reales de la base de datos de Prisma (incluyendo misiones)
        const templates = await prisma.questTemplate.findMany({
            include: {
                Missions: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Retornar las plantillas del Marketplace
        return NextResponse.json({
            success: true,
            templates
        });

    } catch (err: any) {
        console.error('[Misiones-TemplatesAPI] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
