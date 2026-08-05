import prisma from '../src/lib/prisma';

async function fixOrderNegocio() {
  const result = await prisma.pedido.updateMany({
    data: {
      negocioId: 'sneaker-wash-id'
    }
  });

  console.log(`✅ ${result.count} orden(es) asociadas a 'sneaker-wash-id'.`);
}

fixOrderNegocio()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
