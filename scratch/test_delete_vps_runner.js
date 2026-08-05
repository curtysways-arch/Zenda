const { Client } = require('ssh2');

const conn = new Client();
const scriptContent = `
require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/zenda_db';
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function safeRun(name, fn) {
    try {
        const res = await fn();
        console.log('✅ Cleaned ' + name + ':', res);
    } catch (e) {
        console.warn('⚠️ Warning in ' + name + ':', e.message);
    }
}

async function run() {
    const id = 'adad2c22-9e60-406f-b314-88ec45facc2f';
    console.log('🔍 Eliminando negocio ID (secuencial seguro con negocioId):', id);

    try {
        const appointments = await prisma.appointment.findMany({ where: { negocioId: id }, select: { id: true } }).catch(() => []);
        const appointmentIds = appointments.map(a => a.id);

        const courses = await prisma.course.findMany({ where: { businessId: id }, select: { id: true } }).catch(() => []);
        const courseIds = courses.map(c => c.id);

        const staffs = await prisma.staff.findMany({ where: { businessId: id }, select: { id: true } }).catch(() => []);
        const staffIds = staffs.map(s => s.id);

        const resultados = await prisma.resultado.findMany({ where: { businessId: id }, select: { id: true } }).catch(() => []);
        const resultadoIds = resultados.map(r => r.id);

        const usuarios = await prisma.usuario.findMany({ where: { negocioId: id }, select: { id: true } }).catch(() => []);
        const usuarioIds = usuarios.map(u => u.id);

        const clientes = await prisma.cliente.findMany({ where: { negocioId: id }, select: { id: true } }).catch(() => []);
        const clienteIds = clientes.map(c => c.id);

        console.log('Usuarios encontrados:', usuarioIds);

        // 1. Limpieza de usuarios y tablas asociadas
        if (usuarioIds.length > 0) {
            await safeRun('UserPoints by userId', () => prisma.userPoints.deleteMany({ where: { OR: [{ negocioId: id }, { userId: { in: usuarioIds } }] } }));
            await safeRun('PointsHistory by userId', () => prisma.pointsHistory.deleteMany({ where: { OR: [{ negocioId: id }, { userId: { in: usuarioIds } }] } }));
            await safeRun('LoyaltyRedemption by userId', () => prisma.loyaltyRedemption.deleteMany({ where: { OR: [{ negocioId: id }, { userId: { in: usuarioIds } }] } }));
            await safeRun('ClientCoupon by userId', () => prisma.clientCoupon.deleteMany({ where: { OR: [{ negocioId: id }, { userId: { in: usuarioIds } }] } }));
            await safeRun('ReferralReward by userId', () => prisma.referralReward.deleteMany({ where: { OR: [{ negocioId: id }, { userId: { in: usuarioIds } }] } }));
            await safeRun('ReferralEvent by userId', () => prisma.referralEvent.deleteMany({ where: { OR: [{ negocioId: id }, { referrerId: { in: usuarioIds } }, { referredId: { in: usuarioIds } }] } }));
            await safeRun('ReferralCode by userId', () => prisma.referralCode.deleteMany({ where: { OR: [{ negocioId: id }, { userId: { in: usuarioIds } }] } }));
            await safeRun('PushToken by userId', () => prisma.pushToken.deleteMany({ where: { OR: [{ businessId: id }, { userId: { in: usuarioIds } }] } }));
            await safeRun('UserRole', () => prisma.userRole.deleteMany({ where: { user_id: { in: usuarioIds } } }));
            await safeRun('AdminUserNegocio', () => prisma.adminUserNegocio.deleteMany({ where: { negocioId: id } }));
        }

        // 2. Limpieza de citas y dependencias
        if (appointmentIds.length > 0) {
            await safeRun('Rating', () => prisma.rating.deleteMany({ where: { appointmentId: { in: appointmentIds } } }));
            await safeRun('PagoReserva', () => prisma.pagoReserva.deleteMany({ where: { appointmentId: { in: appointmentIds } } }));
        }

        // 3. Limpieza de resultados
        if (resultadoIds.length > 0) {
            await safeRun('CommentResultado', () => prisma.commentResultado.deleteMany({ where: { resultadoId: { in: resultadoIds } } }));
            await safeRun('LikeResultado', () => prisma.likeResultado.deleteMany({ where: { resultadoId: { in: resultadoIds } } }));
        }

        // 4. Limpieza de profesionales
        if (staffIds.length > 0) {
            await safeRun('StaffException', () => prisma.staffException.deleteMany({ where: { staffId: { in: staffIds } } }));
            await safeRun('StaffSchedule', () => prisma.staffSchedule.deleteMany({ where: { staffId: { in: staffIds } } }));
        }

        // 5. Limpieza de cursos
        if (courseIds.length > 0) {
            const enrollments = await prisma.courseEnrollment.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } }).catch(() => []);
            const enrollmentIds = enrollments.map(e => e.id);
            const classes = await prisma.course_classes.findMany({ where: { course_id: { in: courseIds } }, select: { id: true } }).catch(() => []);
            const classIds = classes.map(c => c.id);

            if (classIds.length > 0 || enrollmentIds.length > 0) {
                await safeRun('course_attendance', () => prisma.course_attendance.deleteMany({
                    where: { OR: [{ class_id: { in: classIds } }, { user_id: { in: enrollmentIds } }] }
                }));
            }
            await safeRun('course_classes', () => prisma.course_classes.deleteMany({ where: { course_id: { in: courseIds } } }));
            await safeRun('attendance', () => prisma.attendance.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } }));
            await safeRun('coursePayment', () => prisma.coursePayment.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } }));
            await safeRun('courseEnrollment', () => prisma.courseEnrollment.deleteMany({ where: { courseId: { in: courseIds } } }));
            await safeRun('courseSchedule', () => prisma.courseSchedule.deleteMany({ where: { courseId: { in: courseIds } } }));
        }

        // 6. Fidelización, Puntos, Misiones, Referidos, Cupones del negocio por negocioId / businessId
        await safeRun('UserPoints', () => prisma.userPoints.deleteMany({ where: { negocioId: id } }));
        await safeRun('PointsHistory', () => prisma.pointsHistory.deleteMany({ where: { negocioId: id } }));
        await safeRun('LoyaltyRedemption', () => prisma.loyaltyRedemption.deleteMany({ where: { negocioId: id } }));
        await safeRun('LoyaltyReward', () => prisma.loyaltyReward.deleteMany({ where: { negocioId: id } }));
        await safeRun('LoyaltyLevel', () => prisma.loyaltyLevel.deleteMany({ where: { negocioId: id } }));
        await safeRun('LoyaltySeason', () => prisma.loyaltySeason.deleteMany({ where: { negocioId: id } }));
        await safeRun('ClientCoupon', () => prisma.clientCoupon.deleteMany({ where: { negocioId: id } }));
        await safeRun('Coupon', () => prisma.coupon.deleteMany({ where: { negocioId: id } }));
        await safeRun('ReferralReward', () => prisma.referralReward.deleteMany({ where: { negocioId: id } }));
        await safeRun('ReferralEvent', () => prisma.referralEvent.deleteMany({ where: { negocioId: id } }));
        await safeRun('ReferralCode', () => prisma.referralCode.deleteMany({ where: { negocioId: id } }));
        await safeRun('ReferralCampaign', () => prisma.referralCampaign.deleteMany({ where: { negocioId: id } }));

        await safeRun('AutomaticDiscount', () => prisma.automaticDiscount.deleteMany({ where: { businessId: id } }));
        await safeRun('Bloqueo', () => prisma.bloqueo.deleteMany({ where: { negocioId: id } }));
        await safeRun('Appointment', () => prisma.appointment.deleteMany({ where: { negocioId: id } }));
        await safeRun('Resultado', () => prisma.resultado.deleteMany({ where: { businessId: id } }));
        await safeRun('Course', () => prisma.course.deleteMany({ where: { businessId: id } }));
        await safeRun('Staff', () => prisma.staff.deleteMany({ where: { businessId: id } }));
        await safeRun('Imagen', () => prisma.imagen.deleteMany({ where: { negocioId: id } }));
        await safeRun('Media', () => prisma.media.deleteMany({ where: { businessId: id } }));
        await safeRun('Page', () => prisma.page.deleteMany({ where: { businessId: id } }));
        await safeRun('Payment', () => prisma.payment.deleteMany({ where: { negocio_id: id } }));
        await safeRun('Promotion', () => prisma.promotion.deleteMany({ where: { businessId: id } }));
        await safeRun('PushToken', () => prisma.pushToken.deleteMany({ where: { businessId: id } }));
        await safeRun('Student', () => prisma.student.deleteMany({ where: { businessId: id } }));
        await safeRun('Subscriber', () => prisma.subscriber.deleteMany({ where: { negocioId: id } }));
        await safeRun('SubscriptionHistory', () => prisma.subscriptionHistory.deleteMany({ where: { negocio_id: id } }));
        await safeRun('Suscripcion', () => prisma.suscripcion.deleteMany({ where: { negocioId: id } }));
        await safeRun('Ubicacion', () => prisma.ubicacion.deleteMany({ where: { negocioId: id } }));
        await safeRun('Configuracion', () => prisma.configuracion.deleteMany({ where: { negocioId: id } }));
        await safeRun('Service', () => prisma.service.deleteMany({ where: { negocioId: id } }));
        await safeRun('Cliente', () => prisma.cliente.deleteMany({ where: { negocioId: id } }));
        await safeRun('Usuario', () => prisma.usuario.deleteMany({ where: { negocioId: id } }));

        // 7. Borrado final del negocio
        const deleted = await prisma.negocio.delete({ where: { id } });
        console.log('🎉 NEGOCIO BORRADO EXITOSAMENTE DE FORMA DEFINITIVA:', deleted.id);
    } catch (err) {
        console.error('❌ ERROR FINAL:', err);
    } finally {
        await pool.end();
    }
}
run();
`;

conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if (err) {
            console.error(err);
            conn.end();
            return;
        }
        sftp.writeFile('/opt/Zenda/test_delete_pg.js', scriptContent, (err) => {
            if (err) {
                console.error(err);
                conn.end();
                return;
            }
            console.log('📤 test_delete_pg.js escrito en VPS. Ejecutando borrado...');
            conn.exec('cd /opt/Zenda && node test_delete_pg.js', (err, stream) => {
                if (err) {
                    console.error(err);
                    conn.end();
                    return;
                }
                stream.on('data', d => process.stdout.write(d.toString()));
                stream.stderr.on('data', d => process.stderr.write(d.toString()));
                stream.on('close', () => {
                    conn.end();
                });
            });
        });
    });
}).connect({ 
    host: '157.173.203.174', 
    port: 22, 
    username: 'root', 
    password: 'Elmassuelto005624'
});
