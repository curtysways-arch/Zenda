import prisma from '../src/lib/prisma';

async function fixUserNegocio() {
  const usuario = await prisma.usuario.findFirst({
    where: { email: 'admin@lavado.com' }
  });

  console.log('Usuario encontrado:', usuario);

  if (usuario) {
    const updated = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { negocioId: 'sneaker-wash-id' }
    });
    console.log('✅ Usuario admin@lavado.com actualizado con negocioId: sneaker-wash-id', updated);
  }
}

fixUserNegocio()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
