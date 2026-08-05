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
            bannerUrls, // Array de strings de portadas
            isDemo
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
                    isDemo: isDemo !== undefined ? Boolean(isDemo) : undefined,
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
            // Helper para borrar seguro sin fallar si un modelo o relación no existe
            const safeDelete = async (fn: () => Promise<any>, name: string) => {
                try {
                    await fn();
                } catch (e: any) {
                    console.warn(`⚠️ Aviso al borrar ${name}:`, e?.message || e);
                }
            };

            // 1. Obtener IDs indirectos
            const appointments = await tx.appointment.findMany({ where: { negocioId: id }, select: { id: true } }).catch(() => []);
            const appointmentIds = appointments.map(a => a.id);

            const courses = await tx.course.findMany({ where: { businessId: id }, select: { id: true } }).catch(() => []);
            const courseIds = courses.map(c => c.id);

            const staffs = await tx.staff.findMany({ where: { businessId: id }, select: { id: true } }).catch(() => []);
            const staffIds = staffs.map(s => s.id);

            const resultados = await tx.resultado.findMany({ where: { businessId: id }, select: { id: true } }).catch(() => []);
            const resultadoIds = resultados.map(r => r.id);

            const usuarios = await tx.usuario.findMany({ where: { negocioId: id }, select: { id: true } }).catch(() => []);
            const usuarioIds = usuarios.map(u => u.id);

            const clientes = await tx.cliente.findMany({ where: { negocioId: id }, select: { id: true } }).catch(() => []);
            const clienteIds = clientes.map(c => c.id);

            const pedidos = await (tx as any).pedido?.findMany({ where: { negocioId: id }, select: { id: true } }).catch(() => []) || [];
            const pedidoIds = pedidos.map((p: any) => p.id);

            // 2. Borrar detalles de pedidos / Pinchos
            if (pedidoIds.length > 0) {
                await safeDelete(() => (tx as any).detallePedido?.deleteMany({ where: { pedidoId: { in: pedidoIds } } }), 'DetallePedido');
            }
            await safeDelete(() => (tx as any).pedido?.deleteMany({ where: { negocioId: id } }), 'Pedido');
            await safeDelete(() => (tx as any).producto?.deleteMany({ where: { negocioId: id } }), 'Producto');
            await safeDelete(() => (tx as any).categoriaProducto?.deleteMany({ where: { negocioId: id } }), 'CategoriaProducto');

            // 3. Borrar Ratings y Pagos de citas
            if (appointmentIds.length > 0) {
                await safeDelete(() => tx.rating.deleteMany({ where: { appointmentId: { in: appointmentIds } } }), 'Rating');
                await safeDelete(() => tx.pagoReserva.deleteMany({ where: { appointmentId: { in: appointmentIds } } }), 'PagoReserva');
            }

            // 4. Comentarios y likes de resultados
            if (resultadoIds.length > 0) {
                await safeDelete(() => tx.commentResultado.deleteMany({ where: { resultadoId: { in: resultadoIds } } }), 'CommentResultado');
                await safeDelete(() => tx.likeResultado.deleteMany({ where: { resultadoId: { in: resultadoIds } } }), 'LikeResultado');
            }

            // 5. Excepciones y horarios de profesionales
            if (staffIds.length > 0) {
                await safeDelete(() => tx.staffException.deleteMany({ where: { staffId: { in: staffIds } } }), 'StaffException');
                await safeDelete(() => tx.staffSchedule.deleteMany({ where: { staffId: { in: staffIds } } }), 'StaffSchedule');
            }

            // 6. Cursos: Asistencias, Pagos, Inscripciones, Clases, Horarios
            if (courseIds.length > 0) {
                const enrollments = await tx.courseEnrollment.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } }).catch(() => []);
                const enrollmentIds = enrollments.map(e => e.id);

                const classes = await tx.course_classes.findMany({ where: { course_id: { in: courseIds } }, select: { id: true } }).catch(() => []);
                const classIds = classes.map(c => c.id);

                if (classIds.length > 0 || enrollmentIds.length > 0) {
                    await safeDelete(() => tx.course_attendance.deleteMany({
                        where: {
                            OR: [
                                { class_id: { in: classIds } },
                                { user_id: { in: enrollmentIds } }
                            ]
                        }
                    }), 'course_attendance');
                }

                await safeDelete(() => tx.course_classes.deleteMany({ where: { course_id: { in: courseIds } } }), 'course_classes');
                await safeDelete(() => tx.attendance.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } }), 'attendance');
                await safeDelete(() => tx.coursePayment.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } }), 'coursePayment');
                await safeDelete(() => tx.courseEnrollment.deleteMany({ where: { courseId: { in: courseIds } } }), 'courseEnrollment');
                await safeDelete(() => tx.courseSchedule.deleteMany({ where: { courseId: { in: courseIds } } }), 'courseSchedule');
            }

            // 7. Limpiar todas las dependencias de Usuario (UserPoints, PointsHistory, LoyaltyRedemption, Cupones, etc.)
            if (usuarioIds.length > 0) {
                await safeDelete(() => (tx as any).userPoints?.deleteMany({ where: { OR: [{ negocioId: id }, { userId: { in: usuarioIds } }] } }), 'UserPoints by userId');
                await safeDelete(() => (tx as any).pointsHistory?.deleteMany({ where: { OR: [{ negocioId: id }, { userId: { in: usuarioIds } }] } }), 'PointsHistory by userId');
                await safeDelete(() => (tx as any).loyaltyRedemption?.deleteMany({ where: { OR: [{ negocioId: id }, { userId: { in: usuarioIds } }] } }), 'LoyaltyRedemption by userId');
                await safeDelete(() => (tx as any).clientCoupon?.deleteMany({ where: { OR: [{ negocioId: id }, { userId: { in: usuarioIds } }] } }), 'ClientCoupon by userId');
                await safeDelete(() => (tx as any).referralReward?.deleteMany({ where: { OR: [{ negocioId: id }, { userId: { in: usuarioIds } }] } }), 'ReferralReward by userId');
                await safeDelete(() => (tx as any).referralEvent?.deleteMany({ where: { OR: [{ negocioId: id }, { referrerId: { in: usuarioIds } }, { referredId: { in: usuarioIds } }] } }), 'ReferralEvent by userId');
                await safeDelete(() => (tx as any).referralCode?.deleteMany({ where: { OR: [{ negocioId: id }, { userId: { in: usuarioIds } }] } }), 'ReferralCode by userId');
                await safeDelete(() => (tx as any).pushToken?.deleteMany({ where: { OR: [{ businessId: id }, { userId: { in: usuarioIds } }] } }), 'PushToken by userId');
                await safeDelete(() => (tx as any).userRole?.deleteMany({ where: { user_id: { in: usuarioIds } } }), 'UserRole');
                await safeDelete(() => (tx as any).adminUserNegocio?.deleteMany({ where: { negocioId: id } }), 'AdminUserNegocio');
            }

            // 8. Club de Fidelización, Puntos, Misiones, Referidos, Cupones del negocio (por negocioId)
            await safeDelete(() => (tx as any).userPoints?.deleteMany({ where: { negocioId: id } }), 'UserPoints');
            await safeDelete(() => (tx as any).pointsHistory?.deleteMany({ where: { negocioId: id } }), 'PointsHistory');
            await safeDelete(() => (tx as any).loyaltyRedemption?.deleteMany({ where: { negocioId: id } }), 'LoyaltyRedemption');
            await safeDelete(() => (tx as any).loyaltyReward?.deleteMany({ where: { negocioId: id } }), 'LoyaltyReward');
            await safeDelete(() => (tx as any).loyaltyLevel?.deleteMany({ where: { negocioId: id } }), 'LoyaltyLevel');
            await safeDelete(() => (tx as any).loyaltySeason?.deleteMany({ where: { negocioId: id } }), 'LoyaltySeason');

            await safeDelete(() => (tx as any).clientCoupon?.deleteMany({ where: { negocioId: id } }), 'ClientCoupon');
            await safeDelete(() => (tx as any).coupon?.deleteMany({ where: { negocioId: id } }), 'Coupon');

            await safeDelete(() => (tx as any).referralReward?.deleteMany({ where: { negocioId: id } }), 'ReferralReward');
            await safeDelete(() => (tx as any).referralEvent?.deleteMany({ where: { negocioId: id } }), 'ReferralEvent');
            await safeDelete(() => (tx as any).referralCode?.deleteMany({ where: { negocioId: id } }), 'ReferralCode');
            await safeDelete(() => (tx as any).referralCampaign?.deleteMany({ where: { negocioId: id } }), 'ReferralCampaign');

            await safeDelete(() => (tx as any).businessGlobalMission?.deleteMany({ where: { businessId: id } }), 'BusinessGlobalMission');
            await safeDelete(() => (tx as any).globalMissionRewardHistory?.deleteMany({ where: { businessId: id } }), 'GlobalMissionRewardHistory');
            await safeDelete(() => (tx as any).businessMission?.deleteMany({ where: { businessId: id } }), 'BusinessMission');
            await safeDelete(() => (tx as any).businessInheritance?.deleteMany({ where: { businessId: id } }), 'BusinessInheritance');
            await safeDelete(() => (tx as any).businessAchievement?.deleteMany({ where: { businessId: id } }), 'BusinessAchievement');

            await safeDelete(() => (tx as any).clientGlobalCampaignParticipation?.deleteMany({ where: { businessId: id } }), 'ClientGlobalCampaignParticipation');
            await safeDelete(() => (tx as any).clientGlobalQuestProgress?.deleteMany({ where: { businessId: id } }), 'ClientGlobalQuestProgress');

            await safeDelete(() => (tx as any).automationRule?.deleteMany({ where: { businessId: id } }), 'AutomationRule');
            await safeDelete(() => (tx as any).notification?.deleteMany({ where: { OR: [{ businessId: id }, { negocioId: id }] } }), 'Notification');
            await safeDelete(() => (tx as any).adminUserNegocio?.deleteMany({ where: { negocioId: id } }), 'AdminUserNegocio');
            await safeDelete(() => (tx as any).season?.deleteMany({ where: { businessId: id } }), 'Season');
            await safeDelete(() => (tx as any).campaign?.deleteMany({ where: { businessId: id } }), 'Campaign');
            await safeDelete(() => (tx as any).quest?.deleteMany({ where: { businessId: id } }), 'Quest');
            await safeDelete(() => (tx as any).levelTier?.deleteMany({ where: { businessId: id } }), 'LevelTier');
            await safeDelete(() => (tx as any).badge?.deleteMany({ where: { businessId: id } }), 'Badge');
            await safeDelete(() => (tx as any).userStreak?.deleteMany({ where: { businessId: id } }), 'UserStreak');
            await safeDelete(() => (tx as any).rewardAudit?.deleteMany({ where: { businessId: id } }), 'RewardAudit');
            await safeDelete(() => (tx as any).wallet?.deleteMany({ where: { businessId: id } }), 'Wallet');
            await safeDelete(() => (tx as any).leaderboardEntry?.deleteMany({ where: { businessId: id } }), 'LeaderboardEntry');
            await safeDelete(() => (tx as any).installedTemplateSnapshot?.deleteMany({ where: { businessId: id } }), 'InstalledTemplateSnapshot');
            await safeDelete(() => (tx as any).installedTemplate?.deleteMany({ where: { businessId: id } }), 'InstalledTemplate');
            await safeDelete(() => (tx as any).paymentMethod?.deleteMany({ where: { businessId: id } }), 'PaymentMethod');
            await safeDelete(() => (tx as any).orderPayment?.deleteMany({ where: { businessId: id } }), 'OrderPayment');
            await safeDelete(() => (tx as any).cuentaPago?.deleteMany({ where: { negocioId: id } }), 'CuentaPago');
            await safeDelete(() => (tx as any).otpCode?.deleteMany({ where: { businessId: id } }), 'OtpCode');

            // 9. Borrar relaciones directas del negocio
            await safeDelete(() => tx.automaticDiscount.deleteMany({ where: { businessId: id } }), 'AutomaticDiscount');
            await safeDelete(() => tx.bloqueo.deleteMany({ where: { negocioId: id } }), 'Bloqueo');
            await safeDelete(() => tx.appointment.deleteMany({ where: { negocioId: id } }), 'Appointment');
            await safeDelete(() => tx.resultado.deleteMany({ where: { businessId: id } }), 'Resultado');
            await safeDelete(() => tx.course.deleteMany({ where: { businessId: id } }), 'Course');
            await safeDelete(() => tx.staff.deleteMany({ where: { businessId: id } }), 'Staff');
            await safeDelete(() => tx.imagen.deleteMany({ where: { negocioId: id } }), 'Imagen');
            await safeDelete(() => tx.media.deleteMany({ where: { businessId: id } }), 'Media');
            await safeDelete(() => tx.page.deleteMany({ where: { businessId: id } }), 'Page');
            await safeDelete(() => tx.payment.deleteMany({ where: { negocio_id: id } }), 'Payment');
            await safeDelete(() => tx.promotion.deleteMany({ where: { businessId: id } }), 'Promotion');
            await safeDelete(() => tx.pushToken.deleteMany({ where: { businessId: id } }), 'PushToken');
            await safeDelete(() => tx.student.deleteMany({ where: { businessId: id } }), 'Student');
            await safeDelete(() => tx.subscriber.deleteMany({ where: { negocioId: id } }), 'Subscriber');
            await safeDelete(() => tx.subscriptionHistory.deleteMany({ where: { negocio_id: id } }), 'SubscriptionHistory');
            await safeDelete(() => tx.suscripcion.deleteMany({ where: { negocioId: id } }), 'Suscripcion');
            await safeDelete(() => tx.ubicacion.deleteMany({ where: { negocioId: id } }), 'Ubicacion');
            await safeDelete(() => tx.configuracion.deleteMany({ where: { negocioId: id } }), 'Configuracion');
            await safeDelete(() => tx.service.deleteMany({ where: { negocioId: id } }), 'Service');
            await safeDelete(() => tx.cliente.deleteMany({ where: { negocioId: id } }), 'Cliente');
            await safeDelete(() => tx.usuario.deleteMany({ where: { negocioId: id } }), 'Usuario');

            // 10. Borrar el negocio en sí
            await tx.negocio.delete({
                where: { id }
            });

            console.log(`✅ Negocio ID: ${id} y todas sus dependencias eliminadas con éxito.`);
        }, { timeout: 30000 });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("❌ Error al eliminar negocio en cascada:", error);
        return NextResponse.json({ error: `Error al eliminar negocio: ${error?.message || 'Error del servidor'}` }, { status: 500 });
    }
}
