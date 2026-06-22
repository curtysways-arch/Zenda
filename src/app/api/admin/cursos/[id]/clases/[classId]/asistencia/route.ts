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

        // Get enrollments directly from course
        const enrollments = await prisma.courseEnrollment.findMany({
            where: { courseId: id, status: 'approved' },
            include: { Student: true }
        });

        // Get existing attendances
        const model = (prisma as any).courseAttendance || (prisma as any).CourseAttendance;
        const attendances = await model.findMany({
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
        const { attendances: incomingAttendances } = body; // Array of { user_id, status }

        console.log('Attendance PUT body:', JSON.stringify(body));

        if (!Array.isArray(incomingAttendances)) {
            return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
        }

        if (incomingAttendances.length === 0) {
            console.log('No attendances to update');
            return NextResponse.json({ success: true, message: 'No data provided' });
        }

        // Use a transaction to update all attendances
        // Checking for both PascalCase and camelCase properties just in case
        const model = (prisma as any).courseAttendance || (prisma as any).CourseAttendance;
        
        if (!model) {
            console.error('Prisma model CourseAttendance not found in client properties');
            return NextResponse.json({ error: 'Internal Error: Model not found' }, { status: 500 });
        }

        const updates = incomingAttendances.map(att =>
            model.upsert({
                where: {
                    class_id_user_id: {
                        class_id: classId,
                        user_id: att.user_id
                    }
                },
                update: { status: att.status },
                create: {
                    class_id: classId,
                    user_id: att.user_id,
                    status: att.status
                }
            })
        );

        console.log(`Executing ${updates.length} updates...`);
        const results = await prisma.$transaction(updates);
        console.log('Transaction results:', results.length);

        return NextResponse.json({ success: true, updatedCount: results.length });
    } catch (error) {
        console.error('Error updating attendances:', error);
        return NextResponse.json({ error: 'Error al registrar asistencia: ' + String(error) }, { status: 500 });
    }
}
