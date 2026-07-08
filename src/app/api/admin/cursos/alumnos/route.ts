import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const p = prisma as any;

        const students = await p.student.findMany({
            where: { businessId: negocioId },
            include: {
                enrollments: {
                    include: {
                        Course: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(students);
    } catch (error: any) {
        console.error("Error fetching students:", error);
        return NextResponse.json({ error: "Error al obtener alumnos" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const body = await req.json();
        const p = prisma as any;

        const { name, age, representative_name, phone, email } = body;

        if (!name) {
            return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
        }

        const student = await p.student.create({
            data: {
                name,
                age: age ? parseInt(age) : null,
                representative_name,
                phone,
                email,
                businessId: negocioId
            }
        });

        return NextResponse.json(student);
    } catch (error: any) {
        console.error("Error creating student:", error);
        return NextResponse.json({ error: "Error al registrar alumno" }, { status: 500 });
    }
}
