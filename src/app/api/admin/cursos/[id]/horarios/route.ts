import prisma from "@/lib/prisma";
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

        const { id } = await params;
        const negocioId = (session.user as any).negocioId;

        const course = await prisma.course.findFirst({
            where: { id, businessId: negocioId }
        });

        if (!course) {
            return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
        }

        const schedules = await prisma.courseSchedule.findMany({
            where: { courseId: id },
            include: {
                Service: {
                    select: { nombre: true, id: true }
                }
            },
            orderBy: [
                { day_of_week: 'asc' },
                { start_time: 'asc' }
            ]
        });

        const formatted = schedules.map((s: any) => ({
            ...s,
            court: s.Service
        }));

        return NextResponse.json(formatted);
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

        const { id } = await params;
        const negocioId = (session.user as any).negocioId;

        const course = await prisma.course.findFirst({
            where: { id, businessId: negocioId }
        });

        if (!course) {
            return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
        }

        const body = await req.json();
        const { day_of_week, start_time, end_time, courtId } = body;

        if (day_of_week === undefined || !start_time || !end_time || !courtId) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        const schedule = await prisma.courseSchedule.create({
            data: {
                id: `csch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                day_of_week: parseInt(day_of_week.toString()),
                start_time,
                end_time,
                serviceId: courtId,
                courseId: id
            }
        });

        return NextResponse.json(schedule);
    } catch (error: any) {
        console.error("Error creating schedule:", error);
        return NextResponse.json({ error: "Error al crear horario" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const scheduleId = searchParams.get('scheduleId');

        if (!scheduleId) {
            return NextResponse.json({ error: "ID de horario requerido" }, { status: 400 });
        }

        await prisma.courseSchedule.delete({
            where: { id: scheduleId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting schedule:", error);
        return NextResponse.json({ error: "Error al eliminar horario" }, { status: 500 });
    }
}
