import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GlobalMissionEngine } from '@/lib/growth/globalMissionEngine';

/**
 * GET: Obtener las misiones globales y el progreso/historial del negocio logueado.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener el negocio asociado al administrador logueado
        const user = await prisma.usuario.findUnique({
            where: { id: userId },
            select: { negocioId: true }
        });

        const negocioId = user?.negocioId;
        if (!negocioId) {
            return NextResponse.json({ error: 'Negocio no configurado para este usuario' }, { status: 400 });
        }

        // 1. Sincronizar todas las misiones globales (bajo demanda al abrir la pantalla)
        await GlobalMissionEngine.syncAllMissions(negocioId);

        // 2. Obtener misiones globales activas
        const missions = await prisma.globalMission.findMany({
            where: { activa: true },
            orderBy: [
                { prioridad: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        // 3. Obtener el progreso del negocio
        const progress = await prisma.businessGlobalMission.findMany({
            where: { negocioId }
        });

        // 4. Obtener el historial de recompensas entregadas al negocio
        const history = await prisma.globalMissionRewardHistory.findMany({
            where: { negocioId },
            include: {
                Mission: {
                    select: {
                        titulo: true,
                        icono: true,
                        color: true
                    }
                }
            },
            orderBy: { fecha: 'desc' }
        });

        return NextResponse.json({
            success: true,
            missions,
            progress,
            history
        });
    } catch (err: any) {
        console.error('[API Admin GlobalMissions GET] Error:', err.message);
        return NextResponse.json({ error: 'Error al obtener misiones globales' }, { status: 500 });
    }
}
