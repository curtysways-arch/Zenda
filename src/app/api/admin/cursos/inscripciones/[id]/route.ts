import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PATCH: Aprobar o rechazar una inscripción
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

        // Verificar que la inscripción pertenezca al negocio del admin
        const enrollment = await (prisma as any).CourseEnrollment.findFirst({
            where: {
                id,
                Course: { businessId: negocioId }
            },
            include: { Course: { select: { id: true, name: true, capacity: true } } }
        });

        if (!enrollment) {
            return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
        }

        // Si se está aprobando, verificar capacidad
        if (status === 'approved') {
            const approvedCount = await (prisma as any).CourseEnrollment.count({
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

        const updated = await (prisma as any).CourseEnrollment.update({
            where: { id },
            data: { status },
            include: {
                Student: true,
                Course: { select: { id: true, name: true } }
            }
        });

        const formatted = {
            ...updated,
            student: updated.Student,
            course: updated.Course
        };

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Error updating enrollment:', error);
        return NextResponse.json({ error: 'Error al actualizar inscripción' }, { status: 500 });
    }
}

// DELETE: Eliminar una inscripción
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        const negocioId = (session?.user as any)?.negocioId;
        if (!negocioId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id } = await params;

        const enrollment = await (prisma as any).CourseEnrollment.findFirst({
            where: {
                id,
                Course: { businessId: negocioId }
            }
        });

        if (!enrollment) {
            return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
        }

        await (prisma as any).CourseEnrollment.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting enrollment:', error);
        return NextResponse.json({ error: 'Error al eliminar inscripción' }, { status: 500 });
    }
}
