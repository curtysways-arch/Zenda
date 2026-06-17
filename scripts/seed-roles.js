
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = ['USER', 'PROFESOR', 'ADMIN_NEGOCIO', 'SUPERADMIN'];

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    console.log(`Role ${roleName} ensured.`);
  }

  // Assign current admins to ADMIN_NEGOCIO role
  const admins = await prisma.usuario.findMany({
    where: { role: 'ADMIN' }
  });

  const adminNegocioRole = await prisma.role.findUnique({ where: { name: 'ADMIN_NEGOCIO' } });

  for (const admin of admins) {
    await prisma.userRole.upsert({
      where: {
        user_id_role_id: {
          user_id: admin.id,
          role_id: adminNegocioRole.id
        }
      },
      update: {},
      create: {
        user_id: admin.id,
        role_id: adminNegocioRole.id
      }
    });
    console.log(`Admin ${admin.email || admin.phone} assigned to ADMIN_NEGOCIO role.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
