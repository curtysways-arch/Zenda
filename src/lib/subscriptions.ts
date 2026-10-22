import prisma from "@/lib/prisma";
import { computePhase, canReceiveCustomers, type PhaseInfo } from "@/lib/subscription/lifecycle";

export type SubscriptionStatus = {
    active: boolean;
    /** OK | TRIAL | GRACE | EXPIRED (bloqueado) | SUSPENDED | DEFAULT_PLAN | NOT_FOUND | INVALID_ID */
    reason: string | null;
    phase?: PhaseInfo['phase'];
    info?: PhaseInfo;
    isDemo?: boolean;
};

/**
 * Estado de la suscripción según el ciclo único (prueba → gracia → bloqueado).
 * `active=false` solo cuando el negocio está BLOQUEADO o SUSPENDIDO.
 */
export async function checkSubscriptionStatus(negocioId: string): Promise<SubscriptionStatus> {
    if (!negocioId || typeof negocioId !== 'string') {
        return { active: false, reason: 'INVALID_ID' };
    }

    const negocio = await (prisma.negocio as any).findUnique({
        where: { id: negocioId },
        select: {
            id: true,
            estado: true,
            isDemo: true,
            Suscripcion: {
                select: {
                    estado: true,
                    fechaFin: true,
                    Plan: { select: { isFree: true, price: true } },
                },
            },
        },
    });

    if (!negocio) return { active: false, reason: 'NOT_FOUND' };

    const sub = negocio.Suscripcion;
    const info = computePhase({
        estado: sub?.estado,
        fechaFin: sub?.fechaFin,
        planIsFree: sub?.Plan?.isFree,
        planPrice: sub?.Plan?.price,
        negocioEstado: negocio.estado,
    });

    const isDemo = Boolean(negocio.isDemo);
    if (info.phase === 'SUSPENDED') return { active: false, reason: 'SUSPENDED', phase: info.phase, info, isDemo };
    if (!sub) return { active: true, reason: 'DEFAULT_PLAN', phase: info.phase, info, isDemo };

    const reasonByPhase: Record<string, string> = {
        TRIAL: 'TRIAL',
        ACTIVE: 'OK',
        GRACE: 'GRACE',
        BLOCKED: 'EXPIRED',
        NONE: 'OK',
    };
    return {
        active: canReceiveCustomers(info) || isDemo,
        reason: isDemo ? 'OK' : reasonByPhase[info.phase] || 'OK',
        phase: isDemo ? 'ACTIVE' : info.phase,
        info,
        isDemo,
    };
}

/** El bloqueo por falta de pago se puede apagar en desarrollo con SUBSCRIPTION_ENFORCE=off. */
export function subscriptionEnforced() {
    return String(process.env.SUBSCRIPTION_ENFORCE || '').toLowerCase() !== 'off';
}
