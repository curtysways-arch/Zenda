import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function createAdminDemoCanchas() {
  console.log("=== CREANDO / VERIFICANDO USUARIO ADMIN PARA DEMO-CANCHAS ===");

  const negocio = await prisma.negocio.findUnique({
    where: { slug: 'demo-canchas' },
  });

  if (!negocio) {
    console.error("❌ No se encontró el negocio demo-canchas");
    return;
  }

  const email = 'admin@democanchas.com';
  const plainPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // 1. Crear o actualizar usuario admin
  let usuario = await prisma.usuario.findFirst({
    where: { email },
  });

  if (!usuario) {
    usuario = await prisma.usuario.create({
      data: {
        id: 'admin-demo-canchas-user-id',
        nombre: 'Admin Club Pádel',
        email,
        password: hashedPassword,
        role: 'ADMIN',
        updatedAt: new Date(),
        Negocio: {
          connect: { id: negocio.id }
        }
      },
    });
  } else {
    usuario = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password: hashedPassword,
        role: 'ADMIN',
        updatedAt: new Date(),
        Negocio: {
          connect: { id: negocio.id }
        }
      },
    });
  }

  // 2. Asociar en AdminUserNegocio
  await (prisma as any).adminUserNegocio.upsert({
    where: {
      userId_negocioId: {
        userId: usuario.id,
        negocioId: negocio.id,
      }
    },
    update: { role: 'ADMIN' },
    create: {
      id: 'admin-rel-demo-canchas-1',
      userId: usuario.id,
      negocioId: negocio.id,
      role: 'ADMIN',
      updatedAt: new Date(),
    }
  }).catch(() => {});

  console.log(`\n✅ ACCESO AL PANEL ADMINISTRATIVO DE CANCHAS CREADO EXITOSAMENTE!`);
  console.log(`- URL de Login: http://localhost:3000/login`);
  console.log(`- Email / Usuario: ${email}`);
  console.log(`- Contraseña: ${plainPassword}`);
  console.log(`- Negocio Asociado: ${negocio.nombre} (${negocio.slug})`);
}

createAdminDemoCanchas().catch(console.error).finally(() => process.exit(0));
