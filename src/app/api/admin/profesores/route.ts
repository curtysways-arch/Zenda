
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

        // Obtener todos los usuarios que tienen el rol PROFESOR
        const profesores = await prisma.usuario.findMany({
            where: {
                UserRole: {
                    some: {
                        Role: {
                            name: 'PROFESOR'
                        }
                    }
                }
            },
            select: {
                id: true,
                nombre: true,
                phone: true
            }
        });

        return NextResponse.json(profesores);
    } catch (error) {
        console.error("Error fetching professors:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
