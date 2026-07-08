import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { notificationService } from "@/lib/notifications";
import { NotificationService } from "@/lib/notifications/notificationService";
import crypto from "crypto";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string, id: string }> }
) {
    try {
        const { slug, id } = await params;
        const body = await req.json();
        const { representative_name, phone, email, studentList, comments } = body;

        // Validaciones básicas
        if (!representative_name || !phone || !studentList || !Array.isArray(studentList) || studentList.length === 0) {
            return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
        }

        const negocio = await prisma.negocio.findUnique({
            where: { slug }
        });

        if (!negocio) {
            return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
        }

        const course = await prisma.course.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { CourseEnrollment: true }
                }
            }
        });

        if (!course) {
            return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
        }

        // 🛡️ VERIFICAR CUPO RESTANTE
        const totalAlumnosNuevos = studentList.length;
        if (course._count.CourseEnrollment + totalAlumnosNuevos > course.capacity) {
            return NextResponse.json({ 
                error: `Solo quedan ${course.capacity - course._count.CourseEnrollment} cupos disponibles.` 
            }, { status: 400 });
        }

        // 🇪🇨 LIMPIEZA DE TELÉFONO - Adaptado a Ecuador (593)
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('593')) {
            // OK
        } else if (cleanPhone.startsWith('0')) {
            cleanPhone = `593${cleanPhone.substring(1)}`;
        } else if (cleanPhone.length === 9) {
            cleanPhone = `593${cleanPhone}`;
        } else {
            cleanPhone = `593${cleanPhone}`;
        }

        // 🛡️ LIMPIEZA DE EMAIL (Evitar "duplicados vacíos")
        const cleanEmail = email && email.trim() !== "" ? email.trim().toLowerCase() : null;

        // 👤 BUSCAR O CREAR USUARIO PARA EL PADRE/TUTOR (Evitar conflictos de Email)
        let user = await prisma.usuario.findFirst({
            where: {
                OR: [
                    { phone: cleanPhone },
                    ...(cleanEmail ? [{ email: cleanEmail }] : [])
                ]
            }
        });

        if (!user) {
            user = await prisma.usuario.create({
                data: {
                    id: crypto.randomUUID(),
                    nombre: representative_name,
                    phone: cleanPhone,
                    email: cleanEmail,
                    role: 'USER',
                    negocioId: negocio.id,
                    updatedAt: new Date()
                }
            });
        }

        // 📝 CREAR INSCRIPCIONES
        const enrollmentsPromises = studentList.map((student: any) => {
            let studentAge = null;
            if (student.age) {
                const parsed = parseInt(student.age.toString());
                if (!isNaN(parsed)) studentAge = parsed;
            }

            return (prisma as any).CourseEnrollment.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: user!.id,
                    courseId: course.id,
                    businessId: negocio.id,
                    student_name: student.name || 'Alumno sin nombre',
                    student_age: studentAge,
                    guardian_name: representative_name,
                    guardian_phone: cleanPhone,
                    guardian_email: cleanEmail,
                    status: 'pending',
                    comments: comments || ""
                }
            });
        });

        const enrollments = await prisma.$transaction(enrollmentsPromises);

        // 🔔 NOTIFICACIONES
        try {
            notificationService.sendCourseEnrollmentConfirmation(
                negocio.id,
                representative_name,
                cleanPhone,
                course.name,
                negocio.nombre,
                enrollments[0].id, 
                slug,
                studentList.length
            ).catch(() => {});

            NotificationService.createNotification({
                negocioId: negocio.id,
                tipo: 'CAMPANA',
                categoria: 'SISTEMA',
                titulo: 'Nueva Inscripción',
                descripcion: `📢 ${representative_name} inscribió a ${studentList.length} alumno(s) en ${course.name}.`,
                prioridad: 'INFO',
                priority: 'NORMAL',
                recipientType: 'ALL',
                actionType: 'CUSTOM',
                actionPayload: { screen: 'course_enrollment', enrollmentId: enrollments[0].id },
                channels: ['APP', 'PUSH']
            }).catch(() => {});
        } catch (e) {}

        return NextResponse.json({ 
            success: true, 
            message: "Inscripción recibida correctamente",
            enrollmentId: enrollments[0].id,
            userId: user.id
        });

    } catch (error: any) {
        console.error("Error enrolling:", error);
        return NextResponse.json({ 
            error: "Error interno al procesar la inscripción",
            detail: error.message 
        }, { status: 500 });
    }
}
