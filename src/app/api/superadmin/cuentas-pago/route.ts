import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function checkSuperAdmin(session: any) {
    const user = session?.user;
    const role = user?.role;
    const roles = user?.roles || [];
    return role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN' || roles.includes('SUPERADMIN') || user?.isAdminUser;
}

export async function GET(req: Request) {
    try {
        const session = await getEffectiveAdminSession();
        if (!session || !checkSuperAdmin(session)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const accounts = await prisma.paymentAccount.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(accounts);
    } catch (error) {
        console.error('Error fetching payment accounts:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getEffectiveAdminSession();
        if (!session || !checkSuperAdmin(session)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { banco, numeroCuenta, nombreCuenta, logo, activo } = await req.json();

        if (!banco || !numeroCuenta || !nombreCuenta) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        const account = await prisma.paymentAccount.create({
            data: {
                id: crypto.randomUUID(),
                banco,
                numeroCuenta,
                nombreCuenta,
                logo: logo || null,
                activo: activo !== undefined ? activo : true,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(account);
    } catch (error) {
        console.error('Error creating payment account:', error);
        return NextResponse.json({ error: 'Error interno al crear la cuenta' }, { status: 500 });
    }
}
