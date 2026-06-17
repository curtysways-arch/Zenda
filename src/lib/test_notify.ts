import { notificationService } from './notifications';
import { sendWhatsAppMessage } from './whatsapp-client';

async function main() {
    console.log('Sending direct message via sendWhatsAppMessage...');
    const res1 = await sendWhatsAppMessage('0968118444', 'Prueba directa', 'test');
    console.log('Direct response:', res1);

    console.log('\nSending via notificationService...');
    const res2 = await notificationService.sendSubscriptionApprovalNotification(
        'test-id',
        '0968118444',
        'Test Negocio',
        'Premium',
        new Date()
    );
    console.log('Notification response:', res2);
}

main().catch(console.error);
