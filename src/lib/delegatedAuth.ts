import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    isDemo?: boolean;
    iat: number;
    exp: number;
}

/**
 * Genera un token JWT firmado de delegación y lo guarda en una cookie HTTP-Only segura.
 * Para negocios DEMO, la duración es ilimitada (30 días), mientras que para clientes reales es de 30 minutos.
 */
export async function createDelegatedSession(
    superadminId: string,
    superadminName: string,
    targetBusinessId: string,
    targetBusinessName: string,
    isDemo: boolean = false
) {
    const now = Math.floor(Date.now() / 1000);
    // Negocios demo: 30 días (sin límite de tiempo de 30 min). Negocios reales: 30 minutos.
    const durationSeconds = isDemo ? 30 * 24 * 60 * 60 : DELEGATION_DURATION_MINUTES * 60;
    const expiresAtSeconds = now + durationSeconds;

    const token = await new SignJWT({
        superadminId,
        superadminName,
        targetBusinessId,
        targetBusinessName,
        isDemo,
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
        maxAge: durationSeconds,
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
 * Obtiene la sesión efectiva para el panel Admin (Server Components & Route Handlers).
 * Resuelve y garantiza el acceso cuando existe un token de delegación activo del SuperAdmin.
 */
export async function getEffectiveAdminSession() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (user?.negocioId) {
        return session;
    }

    const delegated = await getDelegatedSession();
    if (delegated.isValid && delegated.payload) {
        let slug = null;
        let isDemo = Boolean(delegated.payload.isDemo);
        let tipoNegocio = 'RESERVA';

        try {
            const targetNegocio: any = await prisma.negocio.findUnique({
                where: { id: delegated.payload.targetBusinessId },
                select: { slug: true, isDemo: true, tipoNegocio: true, nombre: true }
            });
            if (targetNegocio) {
                slug = targetNegocio.slug;
                isDemo = targetNegocio.isDemo ?? isDemo;
                tipoNegocio = targetNegocio.tipoNegocio || 'RESERVA';
            }
        } catch (e) {}

        return {
            user: {
                id: user?.id || delegated.payload.superadminId,
                name: user?.name || delegated.payload.superadminName || 'SuperAdmin',
                email: user?.email || 'superadmin@citiox.com',
                role: 'SUPERADMIN',
                roles: ['SUPERADMIN'],
                isAdminUser: true,
                negocioId: delegated.payload.targetBusinessId,
                isDelegated: true,
                targetBusinessName: delegated.payload.targetBusinessName,
                delegatedExpiresAt: isDemo ? null : delegated.payload.exp * 1000,
                delegatedBy: delegated.payload.superadminId,
                slug,
                isDemo,
                tipoNegocio
            }
        } as any;
    }

    if (delegated.isExpired) {
        return {
            user: {
                ...(user || {}),
                isDelegatedExpired: true
            }
        } as any;
    }

    return session;
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
