import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkDemoRestriction } from '@/lib/demo-protection';
import { storageService } from '@/lib/storage/storageService';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // PROTECCIÓN MODO DEMO
        const demoCheck = await checkDemoRestriction();
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        const body = await req.json();
        const { nombre, categoryId, tipo, duracion, precio, estaActivo, ubicacionId, extraInfo, imageMediaId, coverImageUrl, staffIds } = body;

        let resolvedImageMediaId = imageMediaId;
        if (coverImageUrl) {
            const foundMedia = await prisma.media.findFirst({
                where: { url: coverImageUrl }
            });
            if (foundMedia) {
                resolvedImageMediaId = foundMedia.id;
            }
        }

        // Fetch existing extraInfo first to merge it
        const existing = await prisma.service.findUnique({
            where: { id },
            select: { extraInfo: true }
        });
        const existingExtra = (existing?.extraInfo as any) || {};

        // Actualizar campos conocidos por Prisma
        const service = await prisma.service.update({
            where: { id },
            data: {
                nombre,
                duracion: duracion ? parseInt(duracion) : undefined,
                precio: precio ? parseFloat(precio) : undefined,
                estaActivo,
                imageMediaId: resolvedImageMediaId !== undefined ? resolvedImageMediaId : undefined,
                extraInfo: {
                    ...existingExtra,
                    ...(extraInfo || {}),
                    categoryId: categoryId !== undefined ? (categoryId || null) : existingExtra.categoryId,
                    tipo: tipo !== undefined ? (tipo || null) : existingExtra.tipo
                },
                Staff: staffIds && Array.isArray(staffIds) ? {
                    set: staffIds.map((id: string) => ({ id }))
                } : undefined
            },
        });

        // Actualizar ubicacionId via Prisma (compatible con PostgreSQL y SQLite)
        if (ubicacionId !== undefined) {
            await prisma.service.update({
                where: { id },
                data: { ubicacionId: ubicacionId || null } as any
            });
        }

        return NextResponse.json({ ...service, ubicacionId: ubicacionId ?? null });
    } catch (error) {
        console.error('Error updating service:', error);
        return NextResponse.json({ error: 'Error al actualizar servicio' }, { status: 500 });
    }
}


export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // PROTECCIÓN MODO DEMO
        const demoCheck = await checkDemoRestriction();
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        // 1. Buscar el servicio con sus imágenes antes de eliminar
        const service = await prisma.service.findUnique({
            where: { id },
            include: { Imagen: true }
        });

        if (!service) {
            return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
        }

        // 2. Borrar la imagen de portada principal física si existe
        if (service.imageMediaId) {
            try {
                await storageService.deleteMedia(service.imageMediaId);
            } catch (err) {
                console.error('Error deleting main service image file:', err);
            }
        }

        // 3. Borrar las imágenes de la galería físicas si existen
        if (service.Imagen && service.Imagen.length > 0) {
            for (const img of service.Imagen) {
                try {
                    // Buscar si existe un registro en la tabla Media asociado a esta URL
                    const media = await prisma.media.findFirst({
                        where: { url: img.url }
                    });
                    if (media) {
                        await storageService.deleteMedia(media.id);
                    }
                } catch (err) {
                    console.error(`Error deleting gallery image file: ${img.url}`, err);
                }
            }
            
            // Borrar los registros de la tabla Imagen
            await prisma.imagen.deleteMany({
                where: { serviceId: id }
            });
        }

        // 4. Eliminar el servicio
        await prisma.service.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting service:', error);
        return NextResponse.json({ error: 'Error al eliminar servicio' }, { status: 500 });
    }
}
