import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    const log: string[] = [];

    try {
        // Encontrar el negocio demo (Cancha Los Campeones / complejo-test)
        const demo = await prisma.negocio.findUnique({
            where: { slug: 'complejo-test' }
        });

        if (!demo) {
            return NextResponse.json({ error: 'No se encontró el negocio demo con slug "complejo-test"', log }, { status: 404 });
        }

        log.push(`✅ Negocio demo identificado: ${demo.nombre} (${demo.slug}) - ID: ${demo.id}`);

        // Asegurar que sea demo
        await prisma.negocio.update({
            where: { id: demo.id },
            data: { isDemo: true }
        });

        // Identificar negocios a eliminar
        const otrosNegocios = await prisma.negocio.findMany({
            where: { id: { not: demo.id } },
            select: { id: true, nombre: true }
        });

        log.push(`🗑️ Negocios a eliminar: ${otrosNegocios.length}`);

        for (const neg of otrosNegocios) {
            const id = neg.id;
            log.push(`--- Procesando: ${neg.nombre} (${id}) ---`);

            try {
                // 1. Borrar modelos que dependen de modelos que dependen de Negocio
                
                // Torneos (eliminado)

                // Cursos
                const courses = await prisma.course.findMany({ where: { businessId: id }, select: { id: true } });
                const courseIds = courses.map(c => c.id);
                if (courseIds.length > 0) {
                    await (prisma as any).course_attendance.deleteMany({ where: { enrollment: { courseId: { in: courseIds } } } });
                    await (prisma as any).attendance.deleteMany({ where: { schedule: { courseId: { in: courseIds } } } }); // Por si acaso
                    await (prisma as any).courseSchedule.deleteMany({ where: { courseId: { in: courseIds } } });
                    await (prisma as any).course_classes.deleteMany({ where: { course_id: { in: courseIds } } });
                    await (prisma as any).coursePayment.deleteMany({ where: { enrollment: { courseId: { in: courseIds } } } });
                    await (prisma as any).courseEnrollment.deleteMany({ where: { courseId: { in: courseIds } } });
                    await (prisma as any).course.deleteMany({ where: { id: { in: courseIds } } });
                }

                // 2. Borrar modelos que dependen directamente de Negocio con businessId
                await (prisma as any).otpCode?.deleteMany({ where: { businessId: id } });
                await (prisma as any).promotion.deleteMany({ where: { businessId: id } });
                await (prisma as any).student.deleteMany({ where: { businessId: id } });
                await (prisma as any).page.deleteMany({ where: { businessId: id } });
                await (prisma as any).pushToken.deleteMany({ where: { businessId: id } });
                await (prisma as any).automaticDiscount.deleteMany({ where: { businessId: id } });

                // 3. Borrar modelos que dependen directamente de Negocio con negocio_id (underscore)
                await (prisma as any).subscriptionHistory.deleteMany({ where: { negocio_id: id } });
                await (prisma as any).payment.deleteMany({ where: { negocio_id: id } });

                // 4. Borrar modelos que dependen directamente de Negocio con negocioId
                const services = await prisma.service.findMany({ where: { negocioId: id }, select: { id: true } });
                const serviceIds = services.map(c => c.id);
                if (serviceIds.length > 0) {
                    await (prisma as any).pagoReserva.deleteMany({ where: { Appointment: { serviceId: { in: serviceIds } } } });
                    await prisma.appointment.deleteMany({ where: { serviceId: { in: serviceIds } } });
                    await prisma.bloqueo.deleteMany({ where: { serviceId: { in: serviceIds } } });
                    await prisma.imagen.deleteMany({ where: { serviceId: { in: serviceIds } } });
                    await prisma.service.deleteMany({ where: { id: { in: serviceIds } } });
                }

                await prisma.subscriber.deleteMany({ where: { negocioId: id } });
                await prisma.configuracion.deleteMany({ where: { negocioId: id } });
                await prisma.ubicacion.deleteMany({ where: { negocioId: id } });
                await prisma.suscripcion.deleteMany({ where: { negocioId: id } });
                await prisma.cliente.deleteMany({ where: { negocioId: id } });

                // Usuarios: Desvincular de Negocio (sin borrar para no perder accesos si son admins globales)
                await prisma.usuario.updateMany({
                   where: { negocioId: id },
                   data: { negocioId: null }
                });

                // Finalmente el Negocio
                await prisma.negocio.delete({ where: { id: id } });
                log.push(`  ✅ Negocio "${neg.nombre}" eliminado exitosamente.`);
            } catch (err: any) {
                log.push(`  ❌ Error fatal eliminando ${neg.nombre}: ${err.message}`);
                console.error(err);
            }
        }

        // 3. Asegurar acceso del Super Admin al demo
        const superadmin = await prisma.usuario.findFirst({
            where: { role: 'SUPER_ADMIN' }
        });

        if (superadmin) {
            await prisma.usuario.update({
                where: { id: superadmin.id },
                data: { negocioId: demo.id }
            });
            log.push(`👑 Acceso Super Admin: ${superadmin.email} -> ${demo.nombre}`);
        }

        const restantes = await prisma.negocio.findMany({ select: { nombre: true, slug: true } });

        return NextResponse.json({ 
            status: 'Limpieza con éxito', 
            log, 
            final: restantes 
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message, log }, { status: 500 });
    }
}
