import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const COOKIE_NAME = 'citiox_delegated_session';
const DELEGATION_DURATION_MINUTES = 30;

function getSecretKey() {
    const secret = process.env.NEXTAUTH_SECRET || 'citiox-delegated-superadmin-secret-key-32-chars';
    return new TextEncoder().encode(secret);
}

export interface DelegatedTokenPayload {
    superadminId: string;
    superadminName: string;
    targetBusinessId: string;
    targetBusinessName: string;
    iat: number;
    exp: number;
}

/**
 * Genera un token JWT firmado de delegación y lo guarda en una cookie HTTP-Only segura.
 */
export async function createDelegatedSession(
    superadminId: string,
    superadminName: string,
    targetBusinessId: string,
    targetBusinessName: string
) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = now + DELEGATION_DURATION_MINUTES * 60;

    const token = await new SignJWT({
        superadminId,
        superadminName,
        targetBusinessId,
        targetBusinessName,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now)
        .setExpirationTime(expiresAtSeconds)
        .sign(getSecretKey());

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: DELEGATION_DURATION_MINUTES * 60,
    });

    return {
        token,
        expiresAt: new Date(expiresAtSeconds * 1000),
    };
}

/**
 * Elimina la cookie de delegación.
 */
export async function destroyDelegatedSession() {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
}

/**
 * Lee y verifica la sesión delegada activa de la cookie sin modificar la BD.
 */
export async function getDelegatedSession(): Promise<{
    isValid: boolean;
    payload: DelegatedTokenPayload | null;
    isExpired: boolean;
}> {
    try {
        const cookieStore = await cookies();
        const tokenCookie = cookieStore.get(COOKIE_NAME);

        if (!tokenCookie || !tokenCookie.value) {
            return { isValid: false, payload: null, isExpired: false };
        }

        const { payload } = await jwtVerify(tokenCookie.value, getSecretKey());
        const data = payload as unknown as DelegatedTokenPayload;

        const now = Math.floor(Date.now() / 1000);
        if (data.exp && data.exp < now) {
            return { isValid: false, payload: data, isExpired: true };
        }

        return { isValid: true, payload: data, isExpired: false };
    } catch (error) {
        return { isValid: false, payload: null, isExpired: false };
    }
}

/**
 * Helper para registrar auditoría de delegación en AdminAuditLog.
 */
export async function logDelegatedAudit({
    adminUserId,
    accion,
    targetBusinessId,
    descripcion,
    ipAddress,
}: {
    adminUserId: string;
    accion: 'DELEGATED_ADMIN_ACCESS_STARTED' | 'DELEGATED_ADMIN_ACCESS_ENDED' | 'DELEGATED_ADMIN_ACCESS_EXPIRED';
    targetBusinessId?: string;
    descripcion?: string;
    ipAddress?: string;
}) {
    try {
        await prisma.adminAuditLog.create({
            data: {
                adminUserId,
                accion,
                modulo: 'DELEGATED_ACCESS',
                descripcion: descripcion || `Acceso delegado ${accion}`,
                targetId: targetBusinessId || null,
                targetType: 'Negocio',
                ipAddress: ipAddress || null,
                resultado: 'EXITOSO',
            },
        });
    } catch (err) {
        console.error('Error logging delegated audit:', err);
    }
}
