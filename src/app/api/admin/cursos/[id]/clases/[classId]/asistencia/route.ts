import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; classId: string }> }
) {
    const { id, classId } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const rawEnrollments = await prisma.courseEnrollment.findMany({
            where: { courseId: id, status: 'approved' },
            include: { Student: true }
        });

        const enrollments = rawEnrollments.map((e: any) => ({
            ...e,
            student: e.Student
        }));

        const attendances = await prisma.course_attendance.findMany({
            where: { class_id: classId }
        });

        return NextResponse.json({ enrollments, attendances });
    } catch (error) {
        console.error('Error fetching attendances:', error);
        return NextResponse.json({ error: 'Error al obtener asistencias' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; classId: string }> }
) {
    const { classId } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { attendances: incomingAttendances } = body;

        if (!Array.isArray(incomingAttendances)) {
            return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
        }

        if (incomingAttendances.length === 0) {
            return NextResponse.json({ success: true, message: 'No data provided' });
        }

        const updates = incomingAttendances.map(att =>
            prisma.course_attendance.upsert({
                where: {
                    class_id_user_id: {
                        class_id: classId,
                        user_id: att.user_id
                    }
                },
                update: { status: att.status },
                create: {
                    id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    class_id: classId,
                    user_id: att.user_id,
                    status: att.status
                }
            })
        );

        const results = await prisma.$transaction(updates);

        return NextResponse.json({ success: true, updatedCount: results.length });
    } catch (error) {
        console.error('Error updating attendances:', error);
        return NextResponse.json({ error: 'Error al registrar asistencia: ' + String(error) }, { status: 500 });
    }
}
