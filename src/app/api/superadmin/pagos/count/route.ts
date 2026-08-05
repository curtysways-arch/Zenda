import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;
        const roles = (session?.user as any)?.roles || [];
        const isSuper = role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN' || roles.includes('SUPERADMIN') || (session?.user as any)?.isAdminUser;
        if (!session || !isSuper) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const count = await prisma.payment.count({
            where: { estado_pago: 'pending' }
        });

        return NextResponse.json({ count });
    } catch (error) {
        console.error('Error counting pending payments:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
