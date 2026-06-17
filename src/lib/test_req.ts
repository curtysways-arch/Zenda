import prisma from './prisma';

async function main() {
    console.log('Testing notification logic from request-upgrade...');
    const adminConfig = await prisma.globalConfig.findUnique({
        where: { clave: 'NUMERO_WHATSAPP_ADMIN' }
    });
    const adminWhatsApp = adminConfig?.valor;
    console.log('Admin WA:', adminWhatsApp);

    if (adminWhatsApp) {
        const { notificationService } = require('./notifications');
        const waMessage = `🚨 *Nueva Solicitud de Pago/Plan* 💳\n\nHola Admin, este es un test de solicitud de pago`;
        const res = await notificationService.provider.sendMessage({
            to: adminWhatsApp.replace(/\D/g, ''),
            message: waMessage,
            template: 'solicitud_plan_admin'
        });
        console.log('Result:', res);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
