import prisma from '../src/lib/prisma';

async function main() {
  console.log('Testing Prisma queries...');
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Let's get one business ID first
    const negocio = await prisma.negocio.findFirst();
    if (!negocio) {
      console.log('No business found!');
      return;
    }
    const negocioId = negocio.id;
    console.log(`Using business ID: ${negocioId}`);

    const appointmentsCount = await prisma.appointment.count({
      where: { negocioId }
    });
    console.log(`Total appointments: ${appointmentsCount}`);

    // Test update 1
    console.log('Updating past days appointments...');
    const res1 = await prisma.appointment.updateMany({
      where: {
        negocioId,
        estado: { in: ['pending', 'PENDIENTE'] },
        fecha: { lt: today }
      },
      data: { estado: 'expired' }
    });
    console.log('Res 1:', res1);

    // Test update 2
    console.log('Updating today appointments (past hour)...');
    const nowTime = '23:59'; // test time
    const res2 = await prisma.appointment.updateMany({
      where: {
        negocioId,
        estado: { in: ['pending', 'PENDIENTE'] },
        fecha: today,
        horaInicio: { lt: nowTime }
      },
      data: { estado: 'expired' }
    });
    console.log('Res 2:', res2);

    // Test update 3
    console.log('Updating expired token appointments...');
    const res3 = await prisma.appointment.updateMany({
      where: {
        negocioId,
        estado: { in: ['pending', 'PENDIENTE'] },
        expiresAt: { not: null, lt: new Date() }
      },
      data: { estado: 'expired' }
    });
    console.log('Res 3:', res3);

    console.log('All tests succeeded!');
  } catch (error) {
    console.error('CRITICAL ERROR IN PRISMA TEST:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
