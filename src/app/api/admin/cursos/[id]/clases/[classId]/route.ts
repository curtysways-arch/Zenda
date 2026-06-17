import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; classId: string }> }
) {
    const { classId } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const classDetail = await prisma.course_classes.findUnique({
            where: { id: classId },
            include: {
                Course: true,
                course_attendance: true
            }
        });

        if (!classDetail) {
            return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
        }

        const formatted = {
            ...classDetail,
            course: classDetail.Course,
            attendances: classDetail.course_attendance
        };

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Error fetching course class:', error);
        return NextResponse.json({ error: 'Error al obtener la clase' }, { status: 500 });
    }
}

export async function PATCH(
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
        const { title, description, class_date } = body;

        const updatedClass = await prisma.course_classes.update({
            where: { id: classId },
            data: {
                title,
                description,
                ...(class_date && { class_date: new Date(class_date) })
            }
        });

        return NextResponse.json(updatedClass);
    } catch (error) {
        console.error('Error updating class:', error);
        return NextResponse.json({ error: 'Error al actualizar la clase' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; classId: string }> }
) {
    const { classId } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        await prisma.course_classes.delete({
            where: { id: classId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting class:', error);
        return NextResponse.json({ error: 'Error al eliminar la clase' }, { status: 500 });
    }
}
