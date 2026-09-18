import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'SUPER_ADMIN' || user?.isAdminUser === true;

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();

        const current = await prisma.businessLandingTemplate.findUnique({
            where: { id }
        });

        if (!current) {
            return NextResponse.json({ error: 'Plantilla de landing no encontrada' }, { status: 404 });
        }

        // Si se marca como default, desmarcar las demás del mismo businessTypeId
        if (body.isDefault === true) {
            await prisma.businessLandingTemplate.updateMany({
                where: { businessTypeId: current.businessTypeId, id: { not: id } },
                data: { isDefault: false }
            });
        }

        const updated = await prisma.businessLandingTemplate.update({
            where: { id },
            data: {
                ...(body.name !== undefined && { name: body.name.trim() }),
                ...(body.slug !== undefined && { slug: body.slug.trim().toLowerCase() }),
                ...(body.description !== undefined && { description: body.description?.trim() || null }),
                ...(body.component !== undefined && { component: body.component.trim() }),
                ...(body.previewImage !== undefined && { previewImage: body.previewImage?.trim() || null }),
                ...(body.active !== undefined && { active: Boolean(body.active) }),
                ...(body.isDefault !== undefined && { isDefault: Boolean(body.isDefault) }),
                ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) }),
            },
            include: {
                businessType: true
            }
        });

        return NextResponse.json({ success: true, template: updated });
    } catch (error: any) {
        console.error('Error al actualizar plantilla de landing:', error);
        return NextResponse.json({ error: 'Error al actualizar plantilla', details: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'SUPER_ADMIN' || user?.isAdminUser === true;

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
        }

        const { id } = await params;
        await prisma.businessLandingTemplate.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Plantilla eliminada correctamente' });
    } catch (error: any) {
        console.error('Error al eliminar plantilla de landing:', error);
        return NextResponse.json({ error: 'Error al eliminar plantilla', details: error.message }, { status: 500 });
    }
}
