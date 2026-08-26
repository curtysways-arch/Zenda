import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { nombre, tipo, tipoId, capacidad, precioHora, estaActiva, ubicacionId, extraInfo } = body;

        const currentService = await (prisma as any).service.findUnique({
            where: { id }
        });

        if (!currentService) {
            return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });
        }

        const existingExtra = typeof currentService.extraInfo === 'string'
            ? JSON.parse(currentService.extraInfo || '{}')
            : (currentService.extraInfo || {});

        const updatedExtra = {
            ...existingExtra,
            tipo: tipo !== undefined ? tipo : existingExtra.tipo,
            tipoId: tipoId !== undefined ? tipoId : existingExtra.tipoId,
            capacidad: capacidad !== undefined ? parseInt(capacidad) : existingExtra.capacidad,
            features: extraInfo?.features !== undefined ? extraInfo.features : existingExtra.features
        };

        const updateData: any = {
            updatedAt: new Date(),
            extraInfo: updatedExtra
        };

        if (nombre !== undefined) updateData.nombre = nombre;
        if (precioHora !== undefined) updateData.precio = parseFloat(precioHora);
        if (estaActiva !== undefined) updateData.estaActivo = estaActiva;
        if (ubicacionId !== undefined) updateData.ubicacionId = ubicacionId || null;

        const cancha = await (prisma as any).service.update({
            where: { id },
            data: updateData,
            include: { Imagen: true }
        });

        return NextResponse.json({
            id: cancha.id,
            nombre: cancha.nombre,
            tipo: updatedExtra.tipo,
            tipoId: updatedExtra.tipoId,
            capacidad: updatedExtra.capacidad,
            precioHora: cancha.precio,
            estaActiva: cancha.estaActivo,
            ubicacionId: cancha.ubicacionId,
            extraInfo: updatedExtra,
            imagenes: cancha.Imagen || []
        });
    } catch (error: any) {
        console.error('Error updating cancha:', error);
        return NextResponse.json({ error: 'Error al actualizar cancha: ' + (error?.message || '') }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await (prisma as any).service.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting cancha:', error);
        return NextResponse.json({ error: 'Error al eliminar cancha: ' + (error?.message || '') }, { status: 500 });
    }
}
