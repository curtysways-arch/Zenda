import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function seedAdminUser() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const negocioId = 'demo-canchas-id-100';

  // 1. Crear o actualizar Usuario admin de Lavado de Zapatos
  await prisma.usuario.upsert({
    where: { email: 'admin@lavado.com' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      status: 'verified',
      negocioId,
      updatedAt: new Date()
    },
    create: {
      id: 'usr-admin-lavado',
      nombre: 'Administrador Lavado Premium',
      email: 'admin@lavado.com',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'verified',
      negocioId,
      updatedAt: new Date()
    }
  });

  // 2. Crear o actualizar Usuario admin de Demo Canchas
  await prisma.usuario.upsert({
    where: { email: 'admin@democanchas.com' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      status: 'verified',
      negocioId,
      updatedAt: new Date()
    },
    create: {
      id: 'usr-admin-canchas',
      nombre: 'Administrador Demo Canchas',
      email: 'admin@democanchas.com',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'verified',
      negocioId,
      updatedAt: new Date()
    }
  });

  console.log("✅ CREDENCIALES DE ADMIN NEGOCIO CREADAS:");
  console.log("---------------------------------------------------");
  console.log("Email Admin Lavado:  admin@lavado.com");
  console.log("Email Admin Canchas: admin@democanchas.com");
  console.log("Contraseña para ambos: admin123");
  console.log("---------------------------------------------------");
}

seedAdminUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
