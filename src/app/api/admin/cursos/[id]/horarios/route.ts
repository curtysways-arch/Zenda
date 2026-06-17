import prisma from "@/lib/prisma"; // v2_schema_sync_fix
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { id } = await params; // courseId
        const negocioId = (session.user as any).negocioId;
        const p = prisma as any;

        // Verificar que el curso pertenezca al negocio
        const course = await p.course.findFirst({
            where: { id, businessId: negocioId }
        });

        if (!course) {
            return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
        }

        const schedules = await p.courseSchedule.findMany({
            where: { courseId: id },
            include: {
                service: {
                    select: { nombre: true, id: true }
                }
            },
            orderBy: [
                { day_of_week: 'asc' },
                { start_time: 'asc' }
            ]
        });

        return NextResponse.json(schedules);
    } catch (error: any) {
        console.error("Error fetching schedules:", error);
        return NextResponse.json({ error: "Error al obtener horarios" }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { id } = await params; // courseId
        const negocioId = (session.user as any).negocioId;
        const p = prisma as any;

        // Verificar que el curso pertenezca al negocio
        const course = await p.course.findFirst({
            where: { id, businessId: negocioId }
        });

        if (!course) {
            return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
        }

        const body = await req.json();
        const { day_of_week, start_time, end_time, title } = body;

        if (day_of_week === undefined || !start_time || !end_time) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        // Auto-asignar el primer servicio (sala/cabina) disponible en este negocio
        const primerServicio = await p.service.findFirst({
            where: { negocioId: negocioId }
        });

        if (!primerServicio) {
            return NextResponse.json({ error: "Debe haber al menos un servicio/sala creado en el negocio" }, { status: 400 });
        }

        const schedule = await p.courseSchedule.create({
            data: {
                day_of_week: parseInt(day_of_week),
                start_time,
                end_time,
                title: title || null,
                serviceId: primerServicio.id,
                courseId: id
            }
        });

        return NextResponse.json(schedule);
    } catch (error: any) {
        console.error("Error creating schedule:", error);
        return NextResponse.json({ 
            error: "Error al crear horario", 
            detail: error.message || String(error)
        }, { status: 500 });
    }
}
