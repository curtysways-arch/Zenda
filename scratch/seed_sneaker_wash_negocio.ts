import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function seedSneakerWashNegocio() {
  // 1. Obtener BusinessType de ordenes de servicio
  const bt = await prisma.businessType.findFirst({
    where: {
      OR: [
        { slug: 'ordenes-servicio' },
        { id: 'ordenes-servicio' }
      ]
    }
  });

  // 2. Crear o actualizar el Negocio Sneaker Wash Premium
  const negocio = await prisma.negocio.upsert({
    where: { id: 'sneaker-wash-id' },
    update: {
      nombre: 'Sneaker Wash Premium',
      slug: 'sneaker-wash',
      tipoNegocio: 'SHOE_CARE',
      businessTypeId: bt?.id || null,
      updatedAt: new Date()
    },
    create: {
      id: 'sneaker-wash-id',
      nombre: 'Sneaker Wash Premium',
      slug: 'sneaker-wash',
      tipoNegocio: 'SHOE_CARE',
      businessTypeId: bt?.id || null,
      precioHora: 0,
      horarioApertura: '08:00',
      horarioCierre: '20:00',
      colorPrimario: '#10B981',
      updatedAt: new Date()
    }
  });

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // 3. Vincular admin@lavado.com a sneaker-wash-id
  await prisma.usuario.upsert({
    where: { email: 'admin@lavado.com' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      status: 'verified',
      negocioId: negocio.id,
      updatedAt: new Date()
    },
    create: {
      id: 'usr-admin-lavado',
      nombre: 'Administrador Sneaker Wash',
      email: 'admin@lavado.com',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'verified',
      negocioId: negocio.id,
      updatedAt: new Date()
    }
  });

  console.log("✅ Negocio 'Sneaker Wash Premium' creado y admin@lavado.com vinculado.");
  console.log("---------------------------------------------------");
  console.log("Negocio ID:", negocio.id);
  console.log("Email Admin:", "admin@lavado.com");
  console.log("Contraseña: ", "admin123");
  console.log("---------------------------------------------------");
}

seedSneakerWashNegocio()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
