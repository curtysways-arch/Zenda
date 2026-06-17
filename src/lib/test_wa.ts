import { sendWhatsAppMessage } from './whatsapp-client';
async function main() {
  const result = await sendWhatsAppMessage('0987654321', 'Test message', 'test');
  console.log(result);
}
main();
