import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: Listar inscripciones del negocio del admin
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const negocioId = (session?.user as any)?.negocioId;
        if (!negocioId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status'); // pending | approved | rejected | all
        const courseId = searchParams.get('courseId');

        const where: any = {
            Course: { businessId: negocioId }
        };

        if (status && status !== 'all') {
            where.status = status;
        }
        if (courseId) {
            where.courseId = courseId;
        }

        const enrollments = await (prisma as any).CourseEnrollment.findMany({
            where,
            include: {
                Student: true,
                Course: {
                    select: { id: true, name: true, capacity: true }
                }
            },
            orderBy: { enrollment_date: 'desc' }
        });

        const formatted = enrollments.map((e: any) => ({
            ...e,
            course: e.Course,
            student: e.Student
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Error fetching enrollments:', error);
        return NextResponse.json({ error: 'Error al obtener inscripciones' }, { status: 500 });
    }
}
