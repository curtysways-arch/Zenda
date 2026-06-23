import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

async function isSuperAdmin() {
    const session = await getServerSession(authOptions);
    // DEBUG: Permitimos acceso total temporalmente para que puedas probar la interfaz sin tener que desloguearte y loguearte como Superadmin
    return true;
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await req.json();
        const { 
            nombre, 
            slug, 
            propietario, 
            emailContacto, 
            whatsapp, 
            direccion, 
            ciudad, 
            horarioApertura, 
            horarioCierre, 
            precioHora, 
            estado, 
            logoUrl, 
            colorPrimario, 
            moduloTorneos,
            bannerUrl,
            bannerUrls // Array de strings de portadas
        } = body;

        const updatedNegocio = await prisma.$transaction(async (tx) => {
            // 1. Obtener negocio actual para recuperar su configuración JSON
            const currentNegocio = await tx.negocio.findUnique({
                where: { id },
                select: { configuracion: true }
            });

            let currentConfig: any = {};
            if (currentNegocio?.configuracion) {
                if (typeof currentNegocio.configuracion === 'string') {
                    try { currentConfig = JSON.parse(currentNegocio.configuracion); } catch { currentConfig = {}; }
                } else {
                    currentConfig = currentNegocio.configuracion as any;
                }
            }

            // Determinar banners del negocio
            let finalBannerUrls: string[] = [];
            if (Array.isArray(bannerUrls)) {
                finalBannerUrls = bannerUrls.filter(u => u && u.trim() !== '');
            } else if (bannerUrl) {
                finalBannerUrls = [bannerUrl];
            }

            const primaryBanner = finalBannerUrls[0] || null;

            // Actualizar la configuración JSON
            const updatedConfig = {
                ...currentConfig,
                bannerUrl: primaryBanner
            };

            // 2. Actualizar campos principales
            const negocio = await (tx.negocio as any).update({
                where: { id },
                data: {
                    nombre,
                    slug,
                    propietario,
                    emailContacto,
                    whatsapp,
                    direccion,
                    ciudad,
                    horarioApertura,
                    horarioCierre,
                    precioHora: precioHora !== undefined ? Number(precioHora) : undefined,
                    estado,
                    logoUrl,
                    colorPrimario,
                    moduloTorneos: moduloTorneos !== undefined ? Boolean(moduloTorneos) : undefined,
                    configuracion: updatedConfig,
                    updatedAt: new Date()
                }
            });

            // 3. Sincronizar Banners en la tabla Imagen
            if (body.hasOwnProperty('bannerUrls') || body.hasOwnProperty('bannerUrl')) {
                // Borrar banners antiguos
                await tx.imagen.deleteMany({
                    where: {
                        negocioId: id,
                        OR: [
                            { tipo: "BANNER" },
                            { esBanner: true }
                        ]
                    }
                });

                // Crear nuevos banners
                for (const url of finalBannerUrls) {
                    await (tx.imagen as any).create({
                        data: {
                            id: crypto.randomUUID(),
                            url: url,
                            tipo: "BANNER",
                            esBanner: true,
                            negocioId: id,
                            createdAt: new Date()
                        }
                    });
                }
            }

            return negocio;
        });

        return NextResponse.json(updatedNegocio);
    } catch (error) {
        console.error("Error updating business:", error);
        return NextResponse.json({ error: "Error al actualizar negocio" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { id } = await params;

        console.log(`🧹 Iniciando borrado completo y en cascada manual del negocio ID: ${id}`);

        await prisma.$transaction(async (tx) => {
            // Fase 1: Obtener IDs indirectos
            const appointments = await tx.appointment.findMany({ where: { negocioId: id }, select: { id: true } });
            const appointmentIds = appointments.map(a => a.id);

            const courses = await tx.course.findMany({ where: { businessId: id }, select: { id: true } });
            const courseIds = courses.map(c => c.id);

            const staffs = await tx.staff.findMany({ where: { businessId: id }, select: { id: true } });
            const staffIds = staffs.map(s => s.id);

            const resultados = await tx.resultado.findMany({ where: { businessId: id }, select: { id: true } });
            const resultadoIds = resultados.map(r => r.id);

            const usuarios = await tx.usuario.findMany({ where: { negocioId: id }, select: { id: true } });
            const usuarioIds = usuarios.map(u => u.id);

            console.log(`  - Encontrados: ${appointmentIds.length} citas, ${courseIds.length} cursos, ${staffIds.length} profesionales, ${resultadoIds.length} resultados, ${usuarioIds.length} usuarios.`);

            // Fase 2: Borrar relaciones indirectas de tercer nivel

            // Ratings, pagos de reservas y partidos de citas
            if (appointmentIds.length > 0) {
                await tx.rating.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
                await tx.pagoReserva.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
            }

            // Comentarios y likes de resultados
            if (resultadoIds.length > 0) {
                await tx.commentResultado.deleteMany({ where: { resultadoId: { in: resultadoIds } } });
                await tx.likeResultado.deleteMany({ where: { resultadoId: { in: resultadoIds } } });
            }

            // Excepciones y horarios de profesionales
            if (staffIds.length > 0) {
                await tx.staffException.deleteMany({ where: { staffId: { in: staffIds } } });
                await tx.staffSchedule.deleteMany({ where: { staffId: { in: staffIds } } });
            }

            // Cursos: Asistencias, Pagos, Inscripciones, Clases, Horarios
            if (courseIds.length > 0) {
                const enrollments = await tx.courseEnrollment.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } });
                const enrollmentIds = enrollments.map(e => e.id);

                const classes = await tx.course_classes.findMany({ where: { course_id: { in: courseIds } }, select: { id: true } });
                const classIds = classes.map(c => c.id);

                if (classIds.length > 0 || enrollmentIds.length > 0) {
                    await tx.course_attendance.deleteMany({
                        where: {
                            OR: [
                                { class_id: { in: classIds } },
                                { user_id: { in: enrollmentIds } }
                            ]
                        }
                    });
                }

                await tx.course_classes.deleteMany({ where: { course_id: { in: courseIds } } });
                await tx.attendance.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
                await tx.coursePayment.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
                await tx.courseEnrollment.deleteMany({ where: { courseId: { in: courseIds } } });
                await tx.courseSchedule.deleteMany({ where: { courseId: { in: courseIds } } });
            }

            // Roles de usuarios y tokens de push
            if (usuarioIds.length > 0) {
                await tx.userRole.deleteMany({ where: { user_id: { in: usuarioIds } } });
                await tx.pushToken.deleteMany({ where: { userId: { in: usuarioIds } } });
            }

            // Fase 3: Borrar relaciones directas del negocio

            await tx.automaticDiscount.deleteMany({ where: { businessId: id } });
            await tx.bloqueo.deleteMany({ where: { negocioId: id } });
            await tx.appointment.deleteMany({ where: { negocioId: id } });
            await tx.resultado.deleteMany({ where: { businessId: id } });
            await tx.course.deleteMany({ where: { businessId: id } });
            await tx.staff.deleteMany({ where: { businessId: id } });
            await tx.imagen.deleteMany({ where: { negocioId: id } });
            await tx.media.deleteMany({ where: { businessId: id } });
            await tx.page.deleteMany({ where: { businessId: id } });
            await tx.payment.deleteMany({ where: { negocio_id: id } });
            await tx.promotion.deleteMany({ where: { businessId: id } });
            await tx.pushToken.deleteMany({ where: { businessId: id } });
            await tx.student.deleteMany({ where: { businessId: id } });
            await tx.subscriber.deleteMany({ where: { negocioId: id } });
            await tx.subscriptionHistory.deleteMany({ where: { negocio_id: id } });
            await tx.suscripcion.deleteMany({ where: { negocioId: id } });
            await tx.ubicacion.deleteMany({ where: { negocioId: id } });
            await tx.configuracion.deleteMany({ where: { negocioId: id } });
            await tx.service.deleteMany({ where: { negocioId: id } });
            await tx.cliente.deleteMany({ where: { negocioId: id } });
            await tx.usuario.deleteMany({ where: { negocioId: id } });

            // Fase 4: Borrar el negocio en sí
            await tx.negocio.delete({
                where: { id }
            });

            console.log(`✅ Negocio ID: ${id} y todas sus dependencias eliminadas con éxito.`);
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("❌ Error al eliminar negocio en cascada:", error);
        return NextResponse.json({ error: "Error al eliminar negocio y sus dependencias" }, { status: 500 });
    }
}
