import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'SUPER_ADMIN' || user?.isAdminUser === true;

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Acceso denegado: Requiere permisos de SuperAdmin' }, { status: 403 });
        }

        const [businessTypes, landingTemplates, adminTemplates] = await Promise.all([
            prisma.businessType.findMany({
                where: { active: true },
                orderBy: { sortOrder: 'asc' }
            }),
            prisma.businessLandingTemplate.findMany({
                include: {
                    businessType: {
                        select: { id: true, name: true, slug: true, color: true, icon: true }
                    }
                },
                orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }]
            }),
            prisma.businessAdminTemplate.findMany({
                include: {
                    businessType: {
                        select: { id: true, name: true, slug: true, color: true, icon: true }
                    }
                },
                orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }]
            })
        ]);

        return NextResponse.json({
            success: true,
            businessTypes,
            landingTemplates,
            adminTemplates,
            totals: {
                landings: landingTemplates.length,
                admins: adminTemplates.length,
                activeLandings: landingTemplates.filter(l => l.active).length,
                activeAdmins: adminTemplates.filter(a => a.active).length,
                businessTypes: businessTypes.length
            }
        });
    } catch (error: any) {
        console.error('Error al listar plantillas en Superadmin:', error);
        return NextResponse.json({ error: 'Error al obtener el catálogo de plantillas', details: error.message }, { status: 500 });
    }
}
