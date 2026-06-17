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
            where: { id, businessId: negocioId },
            include: {
                imageMedia: true,
                CourseSchedule: true,
                _count: {
                    select: {
                        CourseEnrollment: { where: { status: 'approved' } }
                    }
                }
            }
        });

        if (!course) {
            return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
        }

        const formattedCourse = {
            ...course,
            schedules: course.CourseSchedule,
            _count: {
                enrollments: course._count?.CourseEnrollment ?? 0
            }
        };

        return NextResponse.json(formattedCourse);
    } catch (error: any) {
        console.error("Error fetching course:", error);
        return NextResponse.json({ error: "Error al obtener curso" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { id } = await params;
        const negocioId = (session.user as any).negocioId;
        const body = await req.json();
        const { name, description, imageUrl, min_age, max_age, coach, price, payment_type, capacity, status, start_date, end_date, content, instructor_id, imageMediaId } = body;

        const updated = await prisma.course.update({
            where: { id },
            data: {
                name: name !== undefined ? name : undefined,
                description: description !== undefined ? description : undefined,
                imageUrl: imageUrl !== undefined ? (imageUrl || null) : undefined,
                imageMediaId: imageMediaId !== undefined ? imageMediaId : undefined,
                min_age: min_age !== undefined ? (min_age ? parseInt(min_age.toString()) : null) : undefined,
                max_age: max_age !== undefined ? (max_age ? parseInt(max_age.toString()) : null) : undefined,
                coach: coach !== undefined ? coach : undefined,
                price: price !== undefined ? parseFloat(price.toString()) : undefined,
                payment_type: payment_type !== undefined ? payment_type : undefined,
                capacity: capacity !== undefined ? parseInt(capacity.toString()) : undefined,
                status: status !== undefined ? status : undefined,
                start_date: start_date !== undefined ? (start_date && start_date !== "" ? new Date(start_date) : null) : undefined,
                end_date: end_date !== undefined ? (end_date && end_date !== "" ? new Date(end_date) : null) : undefined,
                content: content !== undefined ? content : undefined,
                instructor_id: instructor_id !== undefined ? (instructor_id || null) : undefined
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Error updating course:", error);
        return NextResponse.json({ 
            error: "Error al actualizar curso",
            detail: error?.message,
            code: error?.code
         }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { id } = await params;
        const negocioId = (session.user as any).negocioId;
        const p = prisma as any;

        // Verificar propiedad y si tiene alumnos inscritos
        const existing = await p.course.findFirst({
            where: { id, businessId: negocioId },
            include: { _count: { select: { CourseEnrollment: true } } }
        });

        if (!existing) {
            return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
        }

        if (existing._count.CourseEnrollment > 0) {
            return NextResponse.json({
                error: "No se puede eliminar un curso con alumnos inscritos. Desactívalo en su lugar."
            }, { status: 400 });
        }

        await p.course.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Curso eliminado" });
    } catch (error: any) {
        console.error("Error deleting course:", error);
        return NextResponse.json({ error: "Error al eliminar curso" }, { status: 500 });
    }
}
