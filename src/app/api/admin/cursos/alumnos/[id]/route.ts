import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { id } = await params;
        const negocioId = (session.user as any).negocioId;
        const p = prisma as any;

        const body = await req.json();
        const { name, age, representative_name, phone, email } = body;

        const updated = await p.student.updateMany({
            where: { id, businessId: negocioId },
            data: {
                name,
                age: age ? parseInt(age.toString()) : null,
                representative_name,
                phone,
                email
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Error updating student:", error);
        return NextResponse.json({ error: "Error al actualizar alumno" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { id } = await params;
        const negocioId = (session.user as any).negocioId;
        const p = prisma as any;

        // Validar que el alumno no tenga inscripciones activas
        const enrollmentsCount = await p.courseEnrollment.count({
            where: { studentId: id }
        });

        if (enrollmentsCount > 0) {
            return NextResponse.json({ error: "No se puede eliminar un alumno con inscripciones activas" }, { status: 400 });
        }

        await p.student.deleteMany({
            where: { id, businessId: negocioId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting student:", error);
        return NextResponse.json({ error: "Error al eliminar alumno" }, { status: 500 });
    }
}
