import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';

export type BusinessAccessResult =
    | { ok: true; user: any; response?: undefined }
    | { ok: false; response: NextResponse; user?: undefined };

/**
 * Verifica que la sesión actual pueda operar sobre un negocio:
 * su propio negocio, o un superadmin / equipo interno de Citiox.
 */
export async function requireBusinessAccess(negocioId: string): Promise<BusinessAccessResult> {
    const session = await getEffectiveAdminSession();
    const user = session?.user as any;
    if (!user || user.isDelegatedExpired) {
        return { ok: false, response: NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 }) };
    }
    const role = String(user.role || '').toUpperCase();
    const isSuper = user.isAdminUser === true || role === 'SUPERADMIN' || role === 'SUPER_ADMIN';
    if (!isSuper && user.negocioId !== negocioId) {
        return { ok: false, response: NextResponse.json({ error: 'No tienes acceso a este negocio.' }, { status: 403 }) };
    }
    return { ok: true, user };
}
