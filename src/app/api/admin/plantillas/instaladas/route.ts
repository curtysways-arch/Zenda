import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/plantillas/instaladas
 * Retorna todas las InstalledTemplate del negocio autenticado
 * con el campo estadoActualizacion calculado al vuelo.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        if (!user?.negocioId) {
            return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
        }

        const negocioId = user.negocioId as string;

        // Obtener todas las instalaciones del negocio junto con la plantilla origen
        const instalaciones = await prisma.installedTemplate.findMany({
            where: { negocioId },
            include: {
                Template: {
                    select: {
                        id: true,
                        nombre: true,
                        versionSemantica: true,
                    }
                }
            },
            orderBy: { installedAt: 'desc' }
        });

        // Mapear al formato esperado por la UI
        const result = instalaciones.map((inst) => {
            // Comparar versión instalada vs versión actual de la plantilla
            const templateVersionSemantica = inst.Template?.versionSemantica ?? '1.0.0';
            const installedVersion = inst.versionInstalada ?? '1.0.0';
            const hasUpdate = templateVersionSemantica !== installedVersion ||
                inst.estadoActualizacion === 'UPDATE_AVAILABLE';

            return {
                id: inst.id,
                templateId: inst.templateId,
                negocioId: inst.negocioId,
                installedAt: inst.installedAt,
                versionInstalada: inst.versionInstalada,
                reinstalledAt: inst.reinstalledAt,
                estadoActualizacion: hasUpdate ? 'UPDATE_AVAILABLE' : 'UP_TO_DATE',
                template: inst.Template
            };
        });

        return NextResponse.json({ success: true, installed: result });
    } catch (error) {
        console.error('[GET /api/admin/plantillas/instaladas]', error);
        return NextResponse.json({ success: false, error: 'Error al obtener plantillas instaladas' }, { status: 500 });
    }
}
