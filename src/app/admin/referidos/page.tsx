import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import ReferralClient from './ReferralClient';

export default async function ReferidosPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect('/login');
    }

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
        redirect('/login');
    }

    // Obtener lista de personal activo para el canje de premios
    const staffList = await prisma.staff.findMany({
        where: { businessId: negocioId, active: true },
        select: { id: true, name: true }
    });

    return <ReferralClient staffList={staffList} />;
}
