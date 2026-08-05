import prisma from '../src/lib/prisma';

async function checkUsers() {
  const users = await prisma.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      negocioId: true,
      createdAt: true
    }
  });

  console.log("👥 USUARIOS REGISTRADOS EN BD:");
  console.log(JSON.stringify(users, null, 2));
}

checkUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
