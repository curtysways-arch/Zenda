import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const classes = await prisma.course_classes.findMany({
            where: { course_id: id },
            orderBy: { class_date: 'asc' },
            include: {
                _count: {
                    select: { course_attendance: true }
                }
            }
        });

        const formatted = classes.map(c => ({
            ...c,
            _count: { attendances: c._count.course_attendance }
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Error fetching course classes:', error);
        return NextResponse.json({ error: 'Error al obtener clases' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { title, description, class_date } = body;

        if (!title || !class_date) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        const courseClass = await prisma.course_classes.create({
            data: {
                id: crypto.randomUUID(),
                course_id: id,
                title,
                description,
                class_date: new Date(class_date),
            }
        });

        return NextResponse.json(courseClass);
    } catch (error) {
        console.error('Error creating course class:', error);
        return NextResponse.json({ error: 'Error al crear la clase' }, { status: 500 });
    }
}
