/**
 * API Route: GET /api/superadmin/equipo/permisos
 * Lista todos los permisos agrupados por módulo
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/admin-permissions";

export async function GET(req: NextRequest) {
    const { session, error } = await requirePermission('EQUIPO_VER');
    if (error) return error;

    try {
        const permisos = await prisma.adminPermission.findMany({
            orderBy: [{ modulo: 'asc' }, { accion: 'asc' }]
        });

        // Agrupar por módulo
        const grouped = permisos.reduce((acc, perm) => {
            const key = perm.modulo;
            if (!acc[key]) acc[key] = [];
            acc[key].push(perm);
            return acc;
        }, {} as Record<string, typeof permisos>);

        return NextResponse.json({
            total: permisos.length,
            porModulo: grouped,
            lista: permisos,
        });
    } catch (e: any) {
        console.error("GET /equipo/permisos error:", e);
        return NextResponse.json({ error: "Error al obtener permisos" }, { status: 500 });
    }
}
