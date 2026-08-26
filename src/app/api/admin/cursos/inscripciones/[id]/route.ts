import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        const negocioId = (session?.user as any)?.negocioId;
        if (!negocioId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const { status } = await req.json();

        if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
        }

        const enrollment = await prisma.courseEnrollment.findFirst({
            where: {
                id,
                Course: { businessId: negocioId }
            },
            include: { Course: { select: { id: true, name: true, capacity: true } } }
        });

        if (!enrollment) {
            return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
        }

        if (status === 'approved') {
            const approvedCount = await prisma.courseEnrollment.count({
                where: {
                    courseId: enrollment.courseId,
                    status: 'approved'
                }
            });

            if (approvedCount >= enrollment.Course.capacity) {
                return NextResponse.json(
                    { error: 'El curso ha alcanzado su cupo máximo' },
                    { status: 400 }
                );
            }
        }

        const rawUpdated = await prisma.courseEnrollment.update({
            where: { id },
            data: { status },
            include: {
                Student: true,
                Course: { select: { id: true, name: true } }
            }
        });

        const updated = {
            ...rawUpdated,
            student: rawUpdated.Student,
            course: rawUpdated.Course
        };

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating enrollment:', error);
        return NextResponse.json({ error: 'Error al actualizar inscripción' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        const negocioId = (session?.user as any)?.negocioId;
        if (!negocioId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id } = await params;

        const enrollment = await prisma.courseEnrollment.findFirst({
            where: {
                id,
                Course: { businessId: negocioId }
            }
        });

        if (!enrollment) {
            return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
        }

        await prisma.courseEnrollment.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting enrollment:', error);
        return NextResponse.json({ error: 'Error al eliminar inscripción' }, { status: 500 });
    }
}
