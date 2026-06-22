
import { getProfessorSession } from "@/lib/professorAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from 'crypto';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ classId: string }> }
) {
    try {
        const { classId } = await params;
        const session = await getProfessorSession();
        
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { attendance } = await req.json();

        // Validar que la clase pertenezca al profesor
        const cls = await prisma.course_classes.findUnique({
            where: { id: classId },
            include: { Course: true }
        });

        if (!cls || cls.Course.instructor_id !== session.userId) {
            return NextResponse.json({ error: "Prohibido" }, { status: 403 });
        }

        // Guardar asistencia
        for (const item of attendance) {
            if (item.status === 'pending') {
                // Si está pendiente, eliminamos registro si existe
                await prisma.course_attendance.deleteMany({
                    where: {
                        class_id: classId,
                        user_id: item.enrollmentId
                    }
                });
                continue;
            }

            await prisma.course_attendance.upsert({
                where: {
                    class_id_user_id: {
                        class_id: classId,
                        user_id: item.enrollmentId
                    }
                },
                update: {
                    status: item.status
                },
                create: {
                    id: crypto.randomUUID(),
                    class_id: classId,
                    user_id: item.enrollmentId,
                    status: item.status
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error saving attendance:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
