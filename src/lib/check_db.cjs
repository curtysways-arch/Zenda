const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.appointment.count();
    console.log('Appointment count:', count);
    if (count > 0) {
      const all = await prisma.appointment.findMany({ 
        take: 5,
        select: { id: true, estado: true }
      });
      console.log('Recent appointments:', JSON.stringify(all, null, 2));
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
