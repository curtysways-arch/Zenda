import prisma from "@/lib/prisma";

export async function checkSubscriptionStatus(negocioId: string) {
    if (!negocioId || typeof negocioId !== 'string') {
        console.error('❌ checkSubscriptionStatus: negocioId no válido', negocioId);
        return { active: false, reason: 'INVALID_ID' };
    }

    // Usar el nuevo sistema de suscripciones modular
    const negocio = await (prisma.negocio as any).findUnique({
        where: { id: negocioId },
        select: {
            id: true,
            estado: true,
            Suscripcion: {
                select: {
                    estado: true,
                    fechaFin: true
                }
            }
        }
    });

    if (!negocio) return { active: false, reason: 'NOT_FOUND' };

    // Si el negocio está suspendido manualmente por super admin
    if (negocio.estado === 'SUSPENDIDO') {
        return { active: false, reason: 'SUSPENDED' };
    }

    const sub = negocio.Suscripcion;
    if (!sub) return { active: false, reason: 'NO_PLAN' };

    // Validar estado del plan
    const { estado, fechaFin } = sub;

    const now = new Date();
    const isVencido = fechaFin && now > new Date(fechaFin);

    if (estado === 'expired' || estado === 'EXPIRED' || estado === 'VENCIDA' || estado === 'SUSPENDIDA' || isVencido) {
        return { active: false, reason: 'EXPIRED' };
    }

    // Si es trial pero no ha vencido, es OK (por ahora activo total)
    if (estado === 'trial' || estado === 'TRIAL') {
        return { active: true, reason: 'TRIAL' };
    }

    if (estado === 'pendiente' || estado === 'PENDIENTE') {
        return { active: true, reason: 'PENDING' };
    }

    return { active: true, reason: 'OK' };
}
