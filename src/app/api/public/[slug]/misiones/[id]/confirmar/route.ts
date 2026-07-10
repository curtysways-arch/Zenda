import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeRewardActions } from '@/lib/growth/rewardEngine';

export async function POST(
    request: Request,
    { params }: { params: { slug: string; id: string } }
) {
    try {
        const questId = params.id;
        const slug = params.slug;

        // 1. Verificar autenticación del cliente
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 2. Buscar el negocio
        const negocio = await prisma.negocio.findUnique({
            where: { slug }
        });

        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        // 3. Buscar la misión
        const quest = await prisma.quest.findFirst({
            where: {
                id: questId,
                activa: true,
                OR: [
                    { negocioId: negocio.id },
                    { negocioId: null }
                ]
            }
        });

        if (!quest) {
            return NextResponse.json({ error: 'Misión no encontrada o inactiva' }, { status: 404 });
        }

        // 4. Validar tipo de validación (debe ser confirmada por el usuario, ej: REDES_SOCIALES)
        if (quest.validacionTipo !== 'USUARIO' && quest.validacionTipo !== 'USUARIO_CONFIRMA') {
            return NextResponse.json({ error: 'Esta misión no requiere auto-confirmación del usuario' }, { status: 400 });
        }

        // 5. Completar la misión en base de datos de forma transaccional para evitar duplicados
        let yaCompletada = false;

        await prisma.$transaction(async (tx) => {
            const progress = await tx.questProgress.findUnique({
                where: { questId_userId: { questId, userId } }
            });

            if (progress && (progress.estado === 'COMPLETADA' || progress.estado === 'RECLAMADA')) {
                yaCompletada = true;
                return;
            }

            // Crear o actualizar a COMPLETADA
            if (!progress) {
                await tx.questProgress.create({
                    data: {
                        questId,
                        userId,
                        progresoActual: quest.cantidadMeta,
                        progresoRequerido: quest.cantidadMeta,
                        estado: 'COMPLETADA',
                        fechaCompletada: new Date()
                    }
                });
            } else {
                await tx.questProgress.update({
                    where: { id: progress.id },
                    data: {
                        progresoActual: quest.cantidadMeta,
                        estado: 'COMPLETADA',
                        fechaCompletada: new Date()
                    }
                });
            }

            // Registrar en logs de participantes
            await tx.questParticipant.create({
                data: {
                    questId,
                    userId,
                    action: 'COMPLETADA',
                    detalles: 'Auto-confirmación del cliente (Redes Sociales/Social Click)'
                }
            });

            // Disparar las múltiples recompensas asociadas
            const acciones = typeof quest.acciones === 'string'
                ? JSON.parse(quest.acciones)
                : quest.acciones;

            await executeRewardActions(negocio.id, userId, acciones, quest.id, quest.nombre);
        });

        if (yaCompletada) {
            return NextResponse.json({ success: true, message: 'La misión ya estaba completada.' });
        }

        return NextResponse.json({ success: true, message: 'Misión auto-confirmada y completada con éxito.' });

    } catch (err: any) {
        console.error('[Misiones-ConfirmAPI] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
