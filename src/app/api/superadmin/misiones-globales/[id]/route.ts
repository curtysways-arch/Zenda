import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GlobalMissionType, GlobalRewardType } from '@prisma/client';

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * PUT: Actualizar una misión global existente
 */
export async function PUT(
    request: Request,
    { params }: Params
) {
    try {
        const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
        const id = resolvedParams?.id;

        if (!id) {
            return NextResponse.json({ error: 'ID de misión no proporcionado' }, { status: 400 });
        }

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

        // Parseo seguro de fechas
        let parsedFechaInicio: Date | null | undefined = undefined;
        if (fechaInicio !== undefined) {
            if (!fechaInicio) {
                parsedFechaInicio = null;
            } else {
                const d = new Date(fechaInicio);
                parsedFechaInicio = isNaN(d.getTime()) ? null : d;
            }
        }

        let parsedFechaFin: Date | null | undefined = undefined;
        if (fechaFin !== undefined) {
            if (!fechaFin) {
                parsedFechaFin = null;
            } else {
                const d = new Date(fechaFin);
                parsedFechaFin = isNaN(d.getTime()) ? null : d;
            }
        }

        // Parseo seguro de números
        let parsedObjetivo: number | undefined = undefined;
        if (objetivo !== undefined) {
            const num = parseInt(String(objetivo));
            parsedObjetivo = isNaN(num) ? 1 : Math.max(1, num);
        }

        let parsedPrioridad: number | undefined = undefined;
        if (prioridad !== undefined) {
            const num = parseInt(String(prioridad));
            parsedPrioridad = isNaN(num) ? 0 : num;
        }

        // Actualizar misión
        const mission = await prisma.globalMission.update({
            where: { id },
            data: {
                titulo: titulo !== undefined ? String(titulo) : undefined,
                descripcion: descripcion !== undefined ? String(descripcion) : undefined,
                tipo: tipo !== undefined ? (tipo as GlobalMissionType) : undefined,
                objetivo: parsedObjetivo,
                recompensaTipo: recompensaTipo !== undefined ? (recompensaTipo as GlobalRewardType) : undefined,
                recompensaValor: recompensaValor !== undefined ? recompensaValor : undefined,
                fechaInicio: parsedFechaInicio,
                fechaFin: parsedFechaFin,
                activa: activa !== undefined ? !!activa : undefined,
                prioridad: parsedPrioridad,
                icono: icono !== undefined ? (icono ? String(icono) : null) : undefined,
                color: color !== undefined ? (color ? String(color) : null) : undefined
            }
        });

        return NextResponse.json({ success: true, mission });
    } catch (err: any) {
        console.error('[API Superadmin GlobalMissions PUT] Error:', err);
        return NextResponse.json({ error: 'Error al actualizar misión global: ' + (err?.message || 'Error interno') }, { status: 500 });
    }
}

/**
 * PATCH: Alias para PUT
 */
export async function PATCH(request: Request, context: Params) {
    return PUT(request, context);
}

/**
 * DELETE: Eliminar una misión global existente
 */
export async function DELETE(
    request: Request,
    { params }: Params
) {
    try {
        const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
        const id = resolvedParams?.id;

        if (!id) {
            return NextResponse.json({ error: 'ID de misión no proporcionado' }, { status: 400 });
        }

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
        console.error('[API Superadmin GlobalMissions DELETE] Error:', err);
        return NextResponse.json({ error: 'Error al eliminar misión global: ' + (err?.message || 'Error interno') }, { status: 500 });
    }
}

