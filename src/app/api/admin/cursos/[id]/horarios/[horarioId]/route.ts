import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string, horarioId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { id: courseId, horarioId } = await params;
        const negocioId = (session.user as any).negocioId;
        const p = prisma as any;

        // Verificar que el curso pertenezca al negocio
        const course = await p.course.findFirst({
            where: { id: courseId, businessId: negocioId }
        });

        if (!course) {
            return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
        }

        // Eliminar el horario asegurándonos que pertenece al curso
        await p.courseSchedule.delete({
            where: { 
                id: horarioId,
                courseId: courseId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting schedule:", error);
        return NextResponse.json({ error: "Error al eliminar horario" }, { status: 500 });
    }
}
