import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string, id: string }> }
) {
    try {
        const { slug, id } = await params;

        // Buscamos el negocio primero
        const negocio = await prisma.negocio.findUnique({
            where: { slug }
        });

        if (!negocio) {
            return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
        }

        // Buscar la inscripción con detalles del curso, EL PROFESOR Y LAS CLASES
        const p = prisma as any;
        const rawEnrollment = await p.CourseEnrollment.findUnique({
            where: { id },
            include: {
                Course: {
                    include: {
                        Usuario: true, // Incluir al profesor real
                        CourseSchedule: {
                            include: {
                                Service: true
                            }
                        },
                        course_classes: {
                            orderBy: {
                                class_date: 'asc'
                            }
                        }
                    }
                },
                Usuario: true
            }
        });

        if (!rawEnrollment) {
            return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
        }

        const enrollment = {
            ...rawEnrollment,
            course: {
                ...(rawEnrollment.Course || {}),
                instructor: rawEnrollment.Course?.Usuario || null,
                schedules: rawEnrollment.Course?.CourseSchedule?.map((cs: any) => ({
                    ...cs,
                    service: cs.Service
                })) || []
            },
            user: rawEnrollment.Usuario
        };

        // 🛡️ BUSCAR "HERMANOS" (Otras inscripciones del mismo padre/tutor en este mismo curso)
        // Esto permite que el padre alterne entre hijos en la misma vista
        const siblings = await p.CourseEnrollment.findMany({
            where: {
                courseId: enrollment.courseId,
                guardian_phone: enrollment.guardian_phone,
                status: { in: ['pending', 'approved'] }
            },
            select: {
                id: true,
                student_name: true,
                status: true
            }
        });

        // Obtener el teléfono del negocio para el contacto de WhatsApp
        const negocioContact = await p.negocio.findUnique({
            where: { id: enrollment.businessId || negocio.id },
            select: { 
                whatsapp: true, 
                nombre: true,
                colorPrimario: true,
                colorSecundario: true,
                colorNeutral: true,
                colorTexto: true,
                colorTerciario: true
            }
        });

        return NextResponse.json({
            ...enrollment,
            siblings: siblings.length > 1 ? siblings : [], // Si hay más de uno, mandamos la lista
            businessPhone: negocioContact?.whatsapp || "",
            businessName: negocioContact?.nombre || "",
            negocio: {
                colorPrimario: negocioContact?.colorPrimario,
                colorSecundario: negocioContact?.colorSecundario,
                colorNeutral: negocioContact?.colorNeutral,
                colorTexto: negocioContact?.colorTexto,
                colorTerciario: negocioContact?.colorTerciario
            }
        });
    } catch (error) {
        console.error("Error fetching enrollment detail:", error);
        return NextResponse.json({ error: "Error al cargar los detalles de la inscripción" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ slug: string, id: string }> }
) {
    try {
        const { id } = await params;
        const p = prisma as any;

        const enrollment = await p.CourseEnrollment.findUnique({
            where: { id }
        });

        if (!enrollment) {
            return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
        }

        if (enrollment.status !== 'pending') {
            return NextResponse.json({ error: "Solo se pueden cancelar inscripciones en estado pendiente" }, { status: 400 });
        }

        await p.CourseEnrollment.update({
            where: { id },
            data: { status: 'rejected' }
        });

        return NextResponse.json({ success: true, message: "Inscripción cancelada correctamente" });
    } catch (error) {
        console.error("Error canceling enrollment:", error);
        return NextResponse.json({ error: "No se pudo cancelar la inscripción" }, { status: 500 });
    }
}
