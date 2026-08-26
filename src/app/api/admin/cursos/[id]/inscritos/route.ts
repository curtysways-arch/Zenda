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

        const rawEnrollments = await prisma.courseEnrollment.findMany({
            where: { courseId: id },
            include: {
                Student: true
            },
            orderBy: { enrollment_date: 'desc' }
        });

        const enrollments = rawEnrollments.map((e: any) => ({
            ...e,
            student: e.Student
        }));

        return NextResponse.json(enrollments);
    } catch (error: any) {
        console.error("Error fetching enrollments:", error);
        return NextResponse.json({ error: "Error al obtener inscritos" }, { status: 500 });
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

        const body = await req.json();
        const { studentId } = body;

        if (!studentId) {
            return NextResponse.json({ error: "ID de alumno obligatorio" }, { status: 400 });
        }

        const course = await prisma.course.findUnique({
            where: { id },
            include: { _count: { select: { CourseEnrollment: true } } }
        });

        if (!course || course.businessId !== negocioId) {
            return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
        }

        if ((course._count?.CourseEnrollment || 0) >= course.capacity) {
            return NextResponse.json({ error: "El curso ha alcanzado su cupo máximo" }, { status: 400 });
        }

        const existing = await prisma.courseEnrollment.findFirst({
            where: { studentId, courseId: id }
        });

        if (existing) {
            return NextResponse.json({ error: "El alumno ya está inscrito en este curso" }, { status: 400 });
        }

        const enrollment = await prisma.courseEnrollment.create({
            data: {
                id: `enr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                studentId,
                courseId: id,
                status: 'approved'
            }
        });

        return NextResponse.json(enrollment);
    } catch (error: any) {
        console.error("Error creating enrollment:", error);
        return NextResponse.json({ error: "Error al inscribir alumno" }, { status: 500 });
    }
}
