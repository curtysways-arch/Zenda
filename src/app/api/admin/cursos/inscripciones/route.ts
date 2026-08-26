import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const negocioId = (session?.user as any)?.negocioId;
        if (!negocioId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
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

        const rawEnrollments = await prisma.courseEnrollment.findMany({
            where,
            include: {
                Student: true,
                Course: {
                    select: { id: true, name: true, capacity: true }
                }
            },
            orderBy: { enrollment_date: 'desc' }
        });

        const enrollments = rawEnrollments.map((e: any) => ({
            ...e,
            student: e.Student,
            course: e.Course
        }));

        return NextResponse.json(enrollments);
    } catch (error) {
        console.error('Error fetching enrollments:', error);
        return NextResponse.json({ error: 'Error al obtener inscripciones' }, { status: 500 });
    }
}
