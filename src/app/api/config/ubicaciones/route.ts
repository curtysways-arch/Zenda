import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getNegocioId() {
    const session = await getServerSession(authOptions);
    return (session?.user as any)?.negocioId;
}

export async function GET() {
    const negocioId = await getNegocioId();
    if (!negocioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    try {
        const ubicaciones: any[] = await prisma.$queryRawUnsafe(
            `SELECT u.id, u.nombre, u.direccion, u.mapUrl, u.createdAt,
                    COUNT(c.id) as canchasCount
             FROM Ubicacion u
             LEFT JOIN Cancha c ON c.ubicacionId = u.id
             WHERE u.negocioId = ?
             GROUP BY u.id
             ORDER BY u.createdAt ASC`,
            negocioId
        );

        return NextResponse.json(ubicaciones.map(u => ({
            ...u,
            _count: { canchas: Number(u.canchasCount) }
        })));
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error al obtener ubicaciones" }, { status: 500 });
    }
}

import { planLimitValidator } from "@/lib/services/planLimitValidator";

export async function POST(req: Request) {
    const negocioId = await getNegocioId();
    if (!negocioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    try {
        const { nombre, direccion, mapUrl } = await req.json();
        if (!nombre?.trim()) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

        // Validar límites del plan
        const validation = await planLimitValidator.canCreateLocation(negocioId);
        if (!validation.allowed) {
            return NextResponse.json({ error: validation.message }, { status: 403 });
        }

        // Verificar unicidad
        const existing: any[] = await prisma.$queryRawUnsafe(
            `SELECT id FROM Ubicacion WHERE nombre = ? AND negocioId = ?`,
            nombre.trim(), negocioId
        );
        if (existing.length > 0) return NextResponse.json({ error: "Ya existe una sede con ese nombre" }, { status: 400 });

        const id = `ub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const now = new Date().toISOString();
        const dir = direccion?.trim() || null;
        const map = mapUrl?.trim() || null;

        await prisma.$executeRawUnsafe(
            `INSERT INTO Ubicacion (id, nombre, direccion, mapUrl, negocioId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            id, nombre.trim(), dir, map, negocioId, now, now
        );

        return NextResponse.json({ id, nombre: nombre.trim(), direccion: dir, mapUrl: map, negocioId, createdAt: now });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: "Error al crear ubicación" }, { status: 500 });
    }
}
