const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const reservaId = '7801d783-c1bf-4595-9dad-cc0ce11d2fb6';
  const reserva = await prisma.appointment.findUnique({
    where: { id: reservaId }
  });
  console.log("RESERVA FOUND:", reserva);
}

main().catch(console.error).finally(() => prisma.$disconnect());
