import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { planLimitValidator } from "@/lib/services/planLimitValidator";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const negocioId = (session.user as any).negocioId;

        const courses = await prisma.course.findMany({
            where: { businessId: negocioId },
            include: {
                imageMedia: true,
                CourseSchedule: {
                    include: {
                        Service: {
                            select: { nombre: true }
                        }
                    }
                },
                _count: {
                    select: { CourseEnrollment: true }
                },
                CourseEnrollment: {
                    where: { status: 'pending' },
                    select: { id: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formattedCourses = courses.map((c: any) => ({
            ...c,
            pendingCount: c.CourseEnrollment.length,
            enrollments: undefined,
            schedules: c.CourseSchedule.map((s: any) => ({
                ...s,
                service: s.Service // Mapear back a service para el frontend
            })),
            _count: { enrollments: c._count.CourseEnrollment }
        }));

        return NextResponse.json(formattedCourses);
    } catch (error: any) {
        console.error("Error fetching courses:", error);
        return NextResponse.json({ error: "Error al obtener cursos" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const p = prisma as any;

        // Validar plan
        const validation = await planLimitValidator.canAccessCourses(negocioId);
        if (!validation.allowed) {
            return NextResponse.json({ error: validation.message }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, imageUrl, min_age, max_age, coach, price, payment_type, capacity, status, start_date, end_date, content, instructor_id, imageMediaId } = body;

        if (!name || price === undefined || !payment_type || capacity === undefined) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        const course = await prisma.course.create({
            data: {
                name,
                description,
                imageUrl: imageUrl || null,
                imageMediaId: imageMediaId || null,
                min_age: (min_age !== null && min_age !== undefined && min_age !== "") ? parseInt(min_age.toString()) : null,
                max_age: (max_age !== null && max_age !== undefined && max_age !== "") ? parseInt(max_age.toString()) : null,
                coach,
                price: parseFloat(price.toString()),
                payment_type,
                capacity: parseInt(capacity.toString()),
                status: status || 'active',
                start_date: (start_date && start_date !== "") ? new Date(start_date) : null,
                end_date: (end_date && end_date !== "") ? new Date(end_date) : null,
                content: content || null,
                businessId: negocioId,
                instructor_id: (instructor_id && instructor_id !== "") ? instructor_id : null,
            }
        });

        return NextResponse.json(course);
    } catch (error: any) {
        console.error("Error creating course:", error);
        return NextResponse.json({ 
            error: "Error al crear curso",
            detail: error?.message,
            code: error?.code
        }, { status: 500 });
    }
}
