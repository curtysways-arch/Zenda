import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'SUPERADMIN') {
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
