import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GlobalMissionType, GlobalRewardType } from '@prisma/client';

/**
 * GET: Obtener todas las misiones globales (Superadmin)
 */
export async function GET() {
    try {
        const missions = await prisma.globalMission.findMany({
            orderBy: [
                { prioridad: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        return NextResponse.json({ success: true, missions });
    } catch (err: any) {
        console.error('[API Superadmin GlobalMissions GET] Error:', err.message);
        return NextResponse.json({ error: 'Error al obtener misiones globales' }, { status: 500 });
    }
}

/**
 * POST: Crear una nueva misión global (Superadmin)
 */
export async function POST(request: Request) {
    try {
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

        // Validaciones básicas
        if (!titulo || !descripcion || !tipo || objetivo === undefined || !recompensaTipo) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        // Crear misión
        const mission = await prisma.globalMission.create({
            data: {
                titulo,
                descripcion,
                tipo: tipo as GlobalMissionType,
                objetivo: parseInt(String(objetivo)),
                recompensaTipo: recompensaTipo as GlobalRewardType,
                recompensaValor: recompensaValor || {},
                fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
                fechaFin: fechaFin ? new Date(fechaFin) : null,
                activa: activa !== undefined ? !!activa : true,
                prioridad: prioridad !== undefined ? parseInt(String(prioridad)) : 0,
                icono: icono || 'Trophy',
                color: color || '#3b82f6'
            }
        });

        return NextResponse.json({ success: true, mission });
    } catch (err: any) {
        console.error('[API Superadmin GlobalMissions POST] Error:', err.message);
        return NextResponse.json({ error: 'Error al crear misión global: ' + err.message }, { status: 500 });
    }
}
