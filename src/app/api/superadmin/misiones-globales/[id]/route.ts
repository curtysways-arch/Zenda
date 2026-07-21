import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GlobalMissionType, GlobalRewardType } from '@prisma/client';

/**
 * PUT: Actualizar una misión global existente
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const {
            titulo,
            descripcion,
            tipo,
            objetivo,
            recompensaTipo,
            recompensaValor,
            fechaInicio,
            fechaFin,
            activa,
            prioridad,
            icono,
            color
        } = body;

        // Comprobar existencia
        const existing = await prisma.globalMission.findUnique({
            where: { id }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Misión no encontrada' }, { status: 404 });
        }

        // Actualizar misión
        const mission = await prisma.globalMission.update({
            where: { id },
            data: {
                titulo: titulo !== undefined ? titulo : undefined,
                descripcion: descripcion !== undefined ? descripcion : undefined,
                tipo: tipo !== undefined ? (tipo as GlobalMissionType) : undefined,
                objetivo: objetivo !== undefined ? parseInt(String(objetivo)) : undefined,
                recompensaTipo: recompensaTipo !== undefined ? (recompensaTipo as GlobalRewardType) : undefined,
                recompensaValor: recompensaValor !== undefined ? recompensaValor : undefined,
                fechaInicio: fechaInicio !== undefined ? (fechaInicio ? new Date(fechaInicio) : null) : undefined,
                fechaFin: fechaFin !== undefined ? (fechaFin ? new Date(fechaFin) : null) : undefined,
                activa: activa !== undefined ? !!activa : undefined,
                prioridad: prioridad !== undefined ? parseInt(String(prioridad)) : undefined,
                icono: icono !== undefined ? icono : undefined,
                color: color !== undefined ? color : undefined
            }
        });

        return NextResponse.json({ success: true, mission });
    } catch (err: any) {
        console.error('[API Superadmin GlobalMissions PUT] Error:', err.message);
        return NextResponse.json({ error: 'Error al actualizar misión global: ' + err.message }, { status: 500 });
    }
}

/**
 * DELETE: Eliminar una misión global existente
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Comprobar existencia
        const existing = await prisma.globalMission.findUnique({
            where: { id }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Misión no encontrada' }, { status: 404 });
        }

        // Eliminar
        await prisma.globalMission.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Misión eliminada correctamente' });
    } catch (err: any) {
        console.error('[API Superadmin GlobalMissions DELETE] Error:', err.message);
        return NextResponse.json({ error: 'Error al eliminar misión global: ' + err.message }, { status: 500 });
    }
}
