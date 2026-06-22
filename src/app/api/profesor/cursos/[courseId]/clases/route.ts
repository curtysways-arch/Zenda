
import { getProfessorSession } from "@/lib/professorAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { courseId } = await params;
        const session = await getProfessorSession();
        
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { title, description, class_date } = await req.json();

        // Validar que el curso pertenezca al profesor
        const course = await prisma.course.findUnique({
            where: { id: courseId }
        });

        if (!course || course.instructor_id !== session.userId) {
            return NextResponse.json({ error: "Prohibido" }, { status: 403 });
        }

        // Crear la clase
        const newClass = await prisma.course_classes.create({
            data: {
                id: crypto.randomUUID(),
                course_id: courseId,
                title,
                description,
                class_date: new Date(class_date)
            }
        });

        return NextResponse.json(newClass);
    } catch (error) {
        console.error("Error creating class:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
     try {
        const { courseId } = await params;
        const session = await getProfessorSession();
        
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const classes = await prisma.course_classes.findMany({
            where: {
                course_id: courseId,
                Course: {
                    instructor_id: session.userId as string
                }
            },
            orderBy: { 
                class_date: 'desc' 
            }
        });

        return NextResponse.json(classes);
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
