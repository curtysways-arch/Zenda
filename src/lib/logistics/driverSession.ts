/**
 * Sesión de la app de repartidores.
 *
 * Antes la "sesión" era solo un driverId guardado en localStorage: cualquiera podía
 * llamar a la API con un driverId ajeno (o sin él) y ver pedidos con nombres,
 * direcciones y teléfonos de clientes. Ahora, al verificar el código OTP, el servidor
 * entrega una cookie httpOnly firmada (HMAC) con la identidad del repartidor
 * (últimos 9 dígitos del teléfono, igual que la red de repartidores).
 */
import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { phoneKey } from '@/lib/logistics/driverNetwork';

export const DRIVER_COOKIE = 'citiox_driver';
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 días

export type DriverSession = { phoneKey: string; driverId: string; exp: number };

function secret() {
    const s = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!s) {
        if (process.env.NODE_ENV === 'production') throw new Error('NEXTAUTH_SECRET no configurado');
        return 'citiox-dev-driver-secret';
    }
    return s;
}

function b64url(input: string | Buffer) {
    return Buffer.from(input).toString('base64url');
}

function hmac(data: string) {
    return crypto.createHmac('sha256', secret()).update(data).digest('base64url');
}

export function signDriverSession(payload: Omit<DriverSession, 'exp'>): string {
    const body: DriverSession = { ...payload, exp: Math.floor(Date.now() / 1000) + MAX_AGE_S };
    const data = b64url(JSON.stringify(body));
    return `${data}.${hmac(data)}`;
}

export function verifyDriverToken(token?: string | null): DriverSession | null {
    if (!token) return null;
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;
    const expected = hmac(data);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
        const p = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as DriverSession;
        if (!p.phoneKey || !p.driverId || !p.exp || p.exp * 1000 < Date.now()) return null;
        return p;
    } catch {
        return null;
    }
}

export async function getDriverSession(): Promise<DriverSession | null> {
    const store = await cookies();
    return verifyDriverToken(store.get(DRIVER_COOKIE)?.value);
}

export function setDriverCookie(res: NextResponse, payload: Omit<DriverSession, 'exp'>) {
    res.cookies.set(DRIVER_COOKIE, signDriverSession(payload), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: MAX_AGE_S,
    });
    return res;
}

export function clearDriverCookie(res: NextResponse) {
    res.cookies.set(DRIVER_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return res;
}

/** Recursos (fichas de repartidor por negocio) que pertenecen a la persona de la sesión. */
export async function driverResources(session: DriverSession) {
    const rows = await (prisma as any).operableResource.findMany({
        where: { profile: { telefono: { contains: session.phoneKey.slice(-8) } } },
        include: { profile: true, negocio: { select: { id: true, slug: true, nombre: true } } },
    });
    return rows.filter((r: any) => phoneKey(r.profile?.telefono) === session.phoneKey && !(r.metadata as any)?.removedAt);
}

export function isApprovedResource(r: any) {
    return (
        r.active !== false &&
        (r.profile?.verificationStatus || 'APPROVED') === 'APPROVED' &&
        r.profile?.activo !== false
    );
}

/* ── Límite de intentos de OTP (en memoria, por teléfono) ─────────────────────── */
const g = globalThis as any;
const attempts: Map<string, { n: number; until: number }> = g.__citioxDriverOtpAttempts || (g.__citioxDriverOtpAttempts = new Map());
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 5;

export function otpLocked(key: string): boolean {
    const a = attempts.get(key);
    return !!a && a.until > Date.now() && a.n >= MAX_FAILS;
}
export function otpFail(key: string) {
    const a = attempts.get(key);
    if (!a || a.until < Date.now()) attempts.set(key, { n: 1, until: Date.now() + WINDOW_MS });
    else a.n += 1;
}
export function otpReset(key: string) {
    attempts.delete(key);
}
