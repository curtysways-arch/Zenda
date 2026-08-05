import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function setOfficialCredentials() {
  console.log("=== CONFIGURANDO CREDENCIALES OFICIALES ===");

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // 1. Admin Canchas (demo-canchas)
  const demoCanchas = await prisma.negocio.findUnique({ where: { slug: 'demo-canchas' } });
  if (demoCanchas) {
    await prisma.usuario.upsert({
      where: { email: 'admin@democanchas.com' },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        negocioId: demoCanchas.id
      },
      create: {
        id: 'usr-admin-canchas',
        nombre: 'Admin Club Deportivo El Dorado',
        email: 'admin@democanchas.com',
        password: hashedPassword,
        role: 'ADMIN',
        negocioId: demoCanchas.id,
        updatedAt: new Date()
      }
    });
    console.log("✅ Admin Canchas: admin@democanchas.com | Contraseña: admin123");
  }

  // 2. SuperAdmin Global (superadmin@citiox.com)
  try {
    await (prisma as any).adminUser.upsert({
      where: { email: 'superadmin@citiox.com' },
      update: {
        password: hashedPassword,
        activo: true,
        estado: 'ACTIVO'
      },
      create: {
        id: 'adminuser-superadmin',
        nombre: 'SuperAdmin',
        apellido: 'Global',
        email: 'superadmin@citiox.com',
        password: hashedPassword,
        activo: true,
        estado: 'ACTIVO',
        updatedAt: new Date()
      }
    });
    console.log("✅ SuperAdmin Global: superadmin@citiox.com | Contraseña: admin123");
  } catch (e) {
    // Si adminUser no existe, usar Usuario con rol SUPERADMIN
    await prisma.usuario.upsert({
      where: { email: 'superadmin@citiox.com' },
      update: {
        password: hashedPassword,
        role: 'SUPERADMIN'
      },
      create: {
        id: 'usr-superadmin',
        nombre: 'SuperAdmin Global',
        email: 'superadmin@citiox.com',
        password: hashedPassword,
        role: 'SUPERADMIN',
        updatedAt: new Date()
      }
    });
    console.log("✅ SuperAdmin Global (Usuario): superadmin@citiox.com | Contraseña: admin123");
  }
}

setOfficialCredentials().catch(console.error).finally(() => process.exit(0));
