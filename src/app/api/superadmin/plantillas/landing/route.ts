import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'SUPER_ADMIN' || user?.isAdminUser === true;

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
        }

        const body = await request.json();
        const { businessTypeId, name, slug, description, component, previewImage, isDefault, active, sortOrder } = body;

        if (!businessTypeId || !name || !slug || !component) {
            return NextResponse.json({ error: 'Faltan campos obligatorios (businessTypeId, name, slug, component)' }, { status: 400 });
        }

        // Si se marca como predeterminada, desactivar el default previo de este businessType
        if (isDefault) {
            await prisma.businessLandingTemplate.updateMany({
                where: { businessTypeId },
                data: { isDefault: false }
            });
        }

        const nuevaPlantilla = await prisma.businessLandingTemplate.create({
            data: {
                businessTypeId,
                name: name.trim(),
                slug: slug.trim().toLowerCase(),
                description: description?.trim() || null,
                component: component.trim(),
                previewImage: previewImage?.trim() || null,
                isDefault: Boolean(isDefault),
                active: active !== undefined ? Boolean(active) : true,
                sortOrder: Number(sortOrder) || 0,
            },
            include: {
                businessType: true
            }
        });

        return NextResponse.json({
            success: true,
            template: nuevaPlantilla
        });
    } catch (error: any) {
        console.error('Error al crear plantilla de landing:', error);
        return NextResponse.json({ error: 'Error al registrar plantilla de landing', details: error.message }, { status: 500 });
    }
}
