import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const accounts = await prisma.paymentAccount.findMany({
            where: { activo: true },
            select: {
                id: true,
                banco: true,
                numeroCuenta: true,
                nombreCuenta: true,
                logo: true
            },
            orderBy: { banco: 'asc' }
        });
        
        return NextResponse.json(accounts);
    } catch (error) {
        console.error('Error fetching public payment accounts:', error);
        return NextResponse.json({ error: 'Error interno al cargar cuentas de pago' }, { status: 500 });
    }
}
