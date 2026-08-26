import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const negocioId = (session.user as any).negocioId;

        const rawStudents = await prisma.student.findMany({
            where: { businessId: negocioId },
            include: {
                CourseEnrollment: {
                    include: {
                        Course: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        const students = rawStudents.map((s: any) => ({
            ...s,
            enrollments: (s.CourseEnrollment || []).map((e: any) => ({
                ...e,
                course: e.Course
            }))
        }));

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

        const { name, age, representative_name, phone, email } = body;

        if (!name) {
            return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
        }

        const student = await prisma.student.create({
            data: {
                id: `std_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                name,
                age: age ? parseInt(age.toString()) : null,
                representative_name,
                phone,
                email,
                businessId: negocioId,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(student);
    } catch (error: any) {
        console.error("Error creating student:", error);
        return NextResponse.json({ error: "Error al registrar alumno" }, { status: 500 });
    }
}
