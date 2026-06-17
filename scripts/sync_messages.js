const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pendingMsg = '👋 ¡Hola {{nombre}}! Hemos recibido tu solicitud de reserva en *{{negocio}}* para el {{fecha}} a las {{hora}}.\n\n⏳ Estamos validando la disponibilidad. Te notificaremos por aquí lo antes posible.';
  const confirmationMsg = '✅ ¡Hola {{nombre}}! Tu reserva en *{{negocio}}* ha sido *CONFIRMADA*. ⚽\n\n📅 *Fecha:* {{fecha}}\n⏰ *Hora:* {{hora}}\n⏳ *Duración:* {{duracion}} hora(s)\n\nYa puedes crear tu partido e invitar a tus amigos. ¡Te esperamos!';

  console.log('Sincronizando mensajes de WhatsApp...');

  try {
    // Actualizar PENDING_MSG para todos
    const pendingUpdate = await prisma.configuracion.updateMany({
      where: { clave: 'PENDING_MSG' },
      data: { valor: pendingMsg }
    });

    // Actualizar CONFIRMATION_MSG para todos
    const confirmationUpdate = await prisma.configuracion.updateMany({
      where: { clave: 'CONFIRMATION_MSG' },
      data: { valor: confirmationMsg }
    });

    console.log(`✅ Sincronización completada.`);
    console.log(`- Pendientes actualizados: ${pendingUpdate.count}`);
    console.log(`- Confirmados actualizados: ${confirmationUpdate.count}`);

  } catch (error) {
    console.error('❌ Error sincronizando:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
