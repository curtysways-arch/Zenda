import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { addPoints } from '@/lib/loyalty/loyaltyEngine';
import { publishBusinessEvent } from '@/lib/growth/eventBus';

/**
 * Suma puntos del Club de beneficios por una compra (caja, pedido en línea u orden de lavandería)
 * y avisa al motor de misiones. Es idempotente por (negocio, referencia): si la misma venta
 * se procesa dos veces, solo suma una vez.
 *
 * Regla: puntos = total × puntosPorDolar (configuración del negocio), con el multiplicador
 * del nivel del cliente. Solo aplica si el club está activo en el negocio.
 */

export type PurchaseEventType = 'ORDER_COMPLETED' | 'LAUNDRY_ORDER_COMPLETED';

export interface AwardPurchaseInput {
    negocioId: string;
    referenciaId: string;          // id del pedido / venta
    monto: number;
    telefono?: string | null;
    nombre?: string | null;
    userId?: string | null;
    eventType?: PurchaseEventType;
    cantidad?: number;
    metadata?: Record<string, any>;
    crearCliente?: boolean;        // crear la cuenta del cliente si no existe (por defecto sí)
}

export interface AwardPurchaseResult {
    userId: string | null;
    puntos: number;
    nivel?: string | null;
    saldo?: number;
    motivo?: string;
}

const PLACEHOLDER_PHONES = new Set(['0999999999', '9999999999', '09999999999', '9999999999999']);

function parseConfig(raw: any): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw as Record<string, any>;
}

/** Normaliza un teléfono de Ecuador u otro país a solo dígitos. Devuelve null si no es válido. */
export function normalizePhone(raw?: string | null): string | null {
    if (!raw) return null;
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 15) return null;
    if (PLACEHOLDER_PHONES.has(digits) || /^(\d)\1+$/.test(digits)) return null;
    return digits;
}

/** Variantes del mismo número (0991234567 / 593991234567 / 991234567). */
export function phoneVariants(digits: string): string[] {
    const set = new Set<string>([digits, `+${digits}`]);
    if (digits.startsWith('593')) {
        const local = digits.slice(3);
        set.add(local);
        set.add(`0${local}`);
    } else if (digits.startsWith('0')) {
        const noZero = digits.slice(1);
        set.add(noZero);
        set.add(`593${noZero}`);
        set.add(`+593${noZero}`);
    } else if (digits.length === 9) {
        set.add(`0${digits}`);
        set.add(`593${digits}`);
    }
    return Array.from(set);
}

export async function findOrCreateClientByPhone(
    negocioId: string,
    telefono: string | null | undefined,
    nombre?: string | null,
    crear = true,
): Promise<string | null> {
    const digits = normalizePhone(telefono);
    if (!digits) return null;
    const existing = await prisma.usuario.findFirst({
        where: { phone: { in: phoneVariants(digits) } },
        select: { id: true },
    });
    if (existing) return existing.id;
    if (!crear) return null;
    try {
        // Mismo formato que usa la reserva en línea al registrar un cliente nuevo
        const created = await prisma.usuario.create({
            data: {
                id: crypto.randomUUID(),
                nombre: nombre && !/mostrador|consumidor final/i.test(nombre) ? nombre : null,
                phone: digits,
                role: 'USER',
                created_by: 'loyalty_purchase',
                negocioId,
                updatedAt: new Date(),
            } as any,
            select: { id: true },
        });
        return created.id;
    } catch {
        // Carrera: otro proceso lo creó al mismo tiempo
        const again = await prisma.usuario.findFirst({ where: { phone: { in: phoneVariants(digits) } }, select: { id: true } });
        return again?.id || null;
    }
}

export async function awardPurchasePoints(input: AwardPurchaseInput): Promise<AwardPurchaseResult> {
    const { negocioId, referenciaId, monto, eventType = 'ORDER_COMPLETED' } = input;
    try {
        const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { configuracion: true } });
        const config = parseConfig(negocio?.configuracion);

        const clubActivo = Boolean(config.clubPreset) || config.puntosPorDolar !== undefined;
        const puntosActivos = config.puntosActivos !== false;

        let userId = input.userId || null;
        if (!userId) {
            userId = await findOrCreateClientByPhone(negocioId, input.telefono, input.nombre, input.crearCliente !== false && clubActivo && puntosActivos);
        }
        if (!userId) return { userId: null, puntos: 0, motivo: 'SIN_CLIENTE' };

        // Misiones: avanzar siempre que haya cliente (aunque los puntos por compra estén apagados)
        publishBusinessEvent({
            negocioId,
            userId,
            eventType,
            entityId: referenciaId,
            monto: Number(monto) || 0,
            cantidad: input.cantidad ?? 1,
            metadata: input.metadata || {},
        }).catch((e) => console.error('[PurchasePoints] evento de misiones:', e?.message));

        if (!clubActivo || !puntosActivos) return { userId, puntos: 0, motivo: 'CLUB_INACTIVO' };

        const porDolar = Number(config.puntosPorDolar ?? 1);
        if (!(porDolar > 0) || !(Number(monto) > 0)) return { userId, puntos: 0, motivo: 'SIN_PUNTOS' };

        // Idempotencia: una venta suma una sola vez
        const ya = await prisma.pointsHistory.findFirst({
            where: { negocioId, userId, referenciaId, concepto: 'COMPRA' },
            select: { id: true },
        });
        if (ya) return { userId, puntos: 0, motivo: 'YA_SUMADO' };

        const up = await prisma.userPoints.findUnique({
            where: { userId_negocioId: { userId, negocioId } },
            include: { NivelActual: true },
        });
        const multiplicador = up?.NivelActual?.multiplicador ?? 1;
        const puntos = Math.floor(Number(monto) * porDolar * multiplicador);
        if (puntos <= 0) return { userId, puntos: 0, motivo: 'SIN_PUNTOS' };

        await addPoints(
            userId,
            negocioId,
            puntos,
            'COMPRA',
            referenciaId,
            `Compra de $${Number(monto).toFixed(2)}${multiplicador > 1 ? ` (nivel ${up?.NivelActual?.nombre} ×${multiplicador})` : ''}`,
        );

        const after = await prisma.userPoints.findUnique({
            where: { userId_negocioId: { userId, negocioId } },
            include: { NivelActual: true },
        });
        return { userId, puntos, nivel: after?.NivelActual?.nombre ?? null, saldo: after?.puntos ?? undefined };
    } catch (err: any) {
        // Nunca romper una venta por el club
        console.error('[PurchasePoints] Error sumando puntos:', err?.message);
        return { userId: null, puntos: 0, motivo: 'ERROR' };
    }
}
