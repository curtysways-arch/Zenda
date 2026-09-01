import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createDelegatedSession, logDelegatedAudit } from '@/lib/delegatedAuth';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: businessId } = await params;
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const user = session.user as any;
        const isSuperAdmin = user.isAdminUser === true || user.role === 'SUPERADMIN' || user.role === 'SUPER_ADMIN' || (user.roles || []).includes('SUPERADMIN');

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'No autorizado. Se requieren permisos de SuperAdmin' }, { status: 403 });
        }

        // Verificar existencia del negocio objetivo
        const negocio = await prisma.negocio.findUnique({
            where: { id: businessId },
            select: { id: true, nombre: true }
        });

        if (!negocio) {
            return NextResponse.json({ error: 'El negocio no existe' }, { status: 404 });
        }

        // Obtener IP para auditoría
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

        // Crear sesión delegada temporal de 30 minutos
        const superadminName = user.name || user.email || 'SuperAdmin';
        await createDelegatedSession(user.id, superadminName, negocio.id, negocio.nombre);

        // Auditoría obligatoria
        await logDelegatedAudit({
            adminUserId: user.id,
            accion: 'DELEGATED_ADMIN_ACCESS_STARTED',
            targetBusinessId: negocio.id,
            descripcion: `Inicio de acceso delegado al negocio "${negocio.nombre}" (${negocio.id}) por ${superadminName}`,
            ipAddress: ip,
        });

        return NextResponse.json({
            success: true,
            redirectUrl: '/admin',
            businessName: negocio.nombre,
        });
    } catch (error: any) {
        console.error('Error al iniciar acceso delegado:', error);
        return NextResponse.json(
            { error: 'Error interno al procesar el acceso delegado' },
            { status: 500 }
        );
    }
}
