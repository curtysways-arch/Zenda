const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const reservaId = '7801d783-c1bf-4595-9dad-cc0ce11d2fb6';
  const reserva = await prisma.appointment.findUnique({
    where: { id: reservaId },
    include: { cliente: true, service: true, staff: true }
  });
  console.log("RESERVA FOUND:", JSON.stringify(reserva, null, 2));

  // Let's also check who logs in via token
  const clienteTelefono = reserva?.cliente?.telefono;
  const negocioId = reserva?.negocioId;
  console.log("Cliente Telefono:", clienteTelefono, "Negocio ID:", negocioId);

  const clientes = await prisma.cliente.findMany({
    where: { telefono: clienteTelefono }
  });
  console.log("Clientes with this phone:", JSON.stringify(clientes, null, 2));

  // Let's see what the JWT actually encodes by looking at the logs
}

main().catch(console.error).finally(() => prisma.$disconnect());
