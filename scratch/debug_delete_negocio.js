const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('✅ Ejecutando prueba de borrado directo en VPS...');
    const testScript = `
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    async function testDelete() {
        const id = 'adad2c22-9e60-406f-b314-88ec45facc2f';
        console.log('Intentando eliminar negocio ID:', id);
        try {
            await prisma.$transaction(async (tx) => {
                const safeDelete = async (fn, name) => {
                    try { await fn(); } catch (e) { console.warn('Aviso en ' + name + ':', e.message); }
                };

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

                console.log('Usuarios a borrar:', usuarioIds);

                if (usuarioIds.length > 0) {
                    await safeDelete(() => tx.userPoints.deleteMany({ where: { OR: [{ businessId: id }, { userId: { in: usuarioIds } }] } }), 'UserPoints');
                    await safeDelete(() => tx.pointsHistory.deleteMany({ where: { OR: [{ businessId: id }, { userId: { in: usuarioIds } }] } }), 'PointsHistory');
                    await safeDelete(() => tx.loyaltyRedemption.deleteMany({ where: { OR: [{ businessId: id }, { userId: { in: usuarioIds } }] } }), 'LoyaltyRedemption');
                    await safeDelete(() => tx.clientCoupon.deleteMany({ where: { OR: [{ businessId: id }, { userId: { in: usuarioIds } }] } }), 'ClientCoupon');
                    await safeDelete(() => tx.referralReward.deleteMany({ where: { OR: [{ businessId: id }, { userId: { in: usuarioIds } }] } }), 'ReferralReward');
                    await safeDelete(() => tx.referralEvent.deleteMany({ where: { OR: [{ businessId: id }, { referrerId: { in: usuarioIds } }, { referredId: { in: usuarioIds } }] } }), 'ReferralEvent');
                    await safeDelete(() => tx.referralCode.deleteMany({ where: { OR: [{ businessId: id }, { userId: { in: usuarioIds } }] } }), 'ReferralCode');
                    await safeDelete(() => tx.pushToken.deleteMany({ where: { OR: [{ businessId: id }, { userId: { in: usuarioIds } }] } }), 'PushToken');
                    await safeDelete(() => tx.userRole.deleteMany({ where: { user_id: { in: usuarioIds } } }), 'UserRole');
                }

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

                await tx.negocio.delete({ where: { id } });
            });
            console.log('✅ BORRADO EXITOSO EN PRUEBA REAL');
        } catch (err) {
            console.error('❌ ERROR AL BORRAR EN PRUEBA:', err);
        } finally {
            await prisma.$disconnect();
        }
    }
    testDelete();
    `;

    conn.exec(`node -e "${testScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
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
}).connect({ 
    host: '157.173.203.174', 
    port: 22, 
    username: 'root', 
    password: 'Elmassuelto005624'
});
