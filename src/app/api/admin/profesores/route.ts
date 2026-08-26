import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const negocioId = (session.user as any)?.negocioId;

        const profesores = await prisma.usuario.findMany({
            where: {
                ...(negocioId ? { negocioId } : {}),
                role: 'PROFESOR'
            },
            select: {
                id: true,
                nombre: true,
                phone: true
            }
        });

        if (profesores.length === 0) {
            const fallbackUsers = await prisma.usuario.findMany({
                where: negocioId ? { negocioId } : {},
                select: {
                    id: true,
                    nombre: true,
                    phone: true
                },
                take: 20
            });
            return NextResponse.json(fallbackUsers);
        }

        return NextResponse.json(profesores);
    } catch (error) {
        console.error("Error fetching professors:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
