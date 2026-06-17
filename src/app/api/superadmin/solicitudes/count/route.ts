import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function isSuperAdmin() {
    const session = await getServerSession(authOptions);
    return (session?.user as any)?.role === 'SUPER_ADMIN';
}

export async function GET() {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const count = await (prisma.suscripcion as any).count({
            where: { pagoPendiente: true }
        });

        return NextResponse.json({ count });
    } catch (error) {
        console.error("Error obteniendo conteo de solicitudes:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
