import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { id } = await params; // scheduleId
        const negocioId = (session.user as any).negocioId;
        const p = prisma as any;

        // Verificar propiedad (el horario pertenece a un curso que pertenece al negocio)
        const schedule = await p.courseSchedule.findFirst({
            where: { id },
            include: {
                Course: {
                    select: { businessId: true }
                }
            }
        });

        if (!schedule || schedule.Course.businessId !== negocioId) {
            return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
        }

        // Eliminar asistencias relacionadas
        await p.attendance.deleteMany({
            where: { scheduleId: id }
        });

        await p.courseSchedule.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Horario eliminado" });
    } catch (error: any) {
        console.error("Error deleting schedule:", error);
        return NextResponse.json({ error: "Error al eliminar horario" }, { status: 500 });
    }
}
