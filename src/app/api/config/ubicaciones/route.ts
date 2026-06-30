import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { planLimitValidator } from "@/lib/services/planLimitValidator";

async function getNegocioId() {
    const session = await getServerSession(authOptions);
    return (session?.user as any)?.negocioId;
}

export async function GET() {
    const negocioId = await getNegocioId();
    if (!negocioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    try {
        const ubicaciones = await prisma.ubicacion.findMany({
            where: { negocioId },
            orderBy: { createdAt: 'asc' },
            include: {
                _count: { select: { Service: true } }
            }
        });

        return NextResponse.json(ubicaciones.map(u => ({
            ...u,
            _count: { canchas: u._count.Service }
        })));
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error al obtener ubicaciones" }, { status: 500 });
    }
}

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

        // Verificar unicidad (Prisma lanzará error único pero lo manejamos manualmente)
        const existing = await prisma.ubicacion.findFirst({
            where: { nombre: nombre.trim(), negocioId }
        });
        if (existing) return NextResponse.json({ error: "Ya existe una sede con ese nombre" }, { status: 400 });

        // Crear con Prisma ORM (evita problemas de casing en PostgreSQL raw SQL)
        const ubicacion = await prisma.ubicacion.create({
            data: {
                id: `ub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                nombre: nombre.trim(),
                direccion: direccion?.trim() || null,
                mapUrl: mapUrl?.trim() || null,
                negocioId,
                updatedAt: new Date(),
            }
        });

        return NextResponse.json(ubicacion);
    } catch (error: any) {
        console.error('[POST /api/config/ubicaciones] Error:', error?.message || error);
        return NextResponse.json({ error: "Error al crear ubicación: " + (error?.message || 'Error desconocido') }, { status: 500 });
    }
}
