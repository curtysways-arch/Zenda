import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.appointment.count();
    console.log('Appointment count:', count);
    if (count > 0) {
      const first = await prisma.appointment.findFirst({ select: { id: true } });
      console.log('First appointment ID:', first?.id);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
