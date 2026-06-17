import prisma from './prisma';

async function main() {
    console.log('Testing rejection logic...');
    // find a pending payment
    const payment = await prisma.payment.findFirst({
        where: { estado_pago: 'pending' },
        include: { Negocio: true }
    });
    
    if (!payment) {
        console.log('No pending payments found.');
        return;
    }

    console.log('Found payment:', payment.id);

    try {
        const plan = await prisma.plan.findUnique({
            where: { id: payment.plan_id },
            select: { name: true }
        });
        const { notificationService } = await import('./notifications');
        const waMessage = `❌ *Comprobante de Pago Rechazado* ⚠️\n\nHola, te informamos que tu comprobante de pago para el plan *${plan?.name || 'Premium'}* ha sido *RECHAZADO*.\n\nPor favor, verifica los datos del pago y vuelve a subir el comprobante correcto desde tu panel administrativo.\n\n📲 *Ir al Dashboard:* \nhttp://localhost:3000/admin/plan`;
        
        console.log('Sending message to', payment.Negocio?.whatsapp);
        if (payment.Negocio?.whatsapp) {
            await notificationService.provider.sendMessage({
                to: payment.Negocio.whatsapp.replace(/\D/g, ''),
                message: waMessage,
                template: 'rechazo_plan'
            });
            console.log('Message sent!');
        }
    } catch (err) {
        console.error('Error during notification:', err);
    }
}

main().finally(() => prisma.$disconnect());
