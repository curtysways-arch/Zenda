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

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const { id } = await params;

        // Validar que el nivel pertenezca al negocio
        const level = await prisma.loyaltyLevel.findFirst({
            where: { id, negocioId }
        });

        if (!level) {
            return NextResponse.json({ error: "Nivel no encontrado o no pertenece a su negocio" }, { status: 404 });
        }

        await prisma.loyaltyLevel.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "Nivel eliminado exitosamente" });
    } catch (error: any) {
        console.error("Error deleting loyalty level:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
