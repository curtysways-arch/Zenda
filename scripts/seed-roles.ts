
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// 1. Cargar variables de entorno
dotenv.config({ path: path.join(process.cwd(), '.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL no encontrada en el entorno.');
    process.exit(1);
}

// Asegurarnos de usar ruta absoluta para el archivo db
let finalUrl = dbUrl;
if (dbUrl.startsWith('file:')) {
    const relativePath = dbUrl.replace('file:', '');
    const absolutePath = path.resolve(process.cwd(), relativePath);
    finalUrl = `file:${absolutePath}`;
}

const adapter = new PrismaLibSql({
    url: finalUrl,
});

const prisma = new PrismaClient({ adapter });

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

  if (adminNegocioRole) {
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

  // Also assign SUPERADMIN
  const superAdmins = await prisma.usuario.findMany({
    where: { role: 'SUPER_ADMIN' }
  });

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPERADMIN' } });
  if (superAdminRole) {
    for (const admin of superAdmins) {
      await prisma.userRole.upsert({
        where: {
          user_id_role_id: {
            user_id: admin.id,
            role_id: superAdminRole.id
          }
        },
        update: {},
        create: {
          user_id: admin.id,
          role_id: superAdminRole.id
        }
      });
      console.log(`Super Admin ${admin.email} assigned to SUPERADMIN role.`);
    }
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
