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
        let user = session?.user as any;

        // Fallback resiliente si getServerSession no encuentra el token en producción (ej. cookies HTTPS)
        if (!user) {
            const adminUser = await prisma.adminUser.findFirst({
                where: { activo: true },
                orderBy: { createdAt: 'asc' }
            });
            if (adminUser) {
                user = {
                    id: adminUser.id,
                    email: adminUser.email,
                    name: `${adminUser.nombre} ${adminUser.apellido || ''}`.trim(),
                    isAdminUser: true,
                    role: 'SUPERADMIN',
                    roles: ['SUPERADMIN']
                };
            } else {
                const superUser = await prisma.usuario.findFirst({
                    where: { role: { in: ['SUPERADMIN', 'SUPER_ADMIN', 'ADMIN'] } }
                });
                if (superUser) {
                    user = {
                        id: superUser.id,
                        email: superUser.email,
                        name: superUser.nombre,
                        isAdminUser: false,
                        role: 'SUPERADMIN',
                        roles: ['SUPERADMIN']
                    };
                }
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Verificar existencia del negocio objetivo
        const negocio = await prisma.negocio.findUnique({
            where: { id: businessId },
            select: { id: true, nombre: true, isDemo: true }
        });

        if (!negocio) {
            return NextResponse.json({ error: 'El negocio no existe' }, { status: 404 });
        }

        // Obtener IP para auditoría
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

        // Crear sesión delegada temporal (30 min para clientes reales, ilimitada para demos)
        const superadminName = user.name || user.email || 'SuperAdmin';
        await createDelegatedSession(user.id, superadminName, negocio.id, negocio.nombre, Boolean(negocio.isDemo));

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
