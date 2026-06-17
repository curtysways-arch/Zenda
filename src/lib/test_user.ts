import { sendWhatsAppMessage } from './whatsapp-client';

async function main() {
    console.log('Sending direct test message to user phone...');
    const res = await sendWhatsAppMessage('0983173408', 'Hola, este es un mensaje de prueba para verificar las notificaciones del sistema de pagos.', 'test_user');
    console.log('Direct response:', res);
}

main().catch(console.error);
