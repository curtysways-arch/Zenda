
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const clientes = await prisma.cliente.findMany({ take: 5 });
    console.log('Sample Clientes:');
    console.log(JSON.stringify(clientes, null, 2));

    const reservas = await prisma.reserva.findMany({ take: 5, include: { cliente: true } });
    console.log('\nSample Reservas with Clientes:');
    console.log(JSON.stringify(reservas, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
