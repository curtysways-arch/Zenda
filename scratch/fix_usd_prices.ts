import prisma from '../src/lib/prisma';

async function fixUsdPrices() {
  console.log("=== ACTUALIZANDO PRECIOS A DÓLARES (USD) PARA ECUADOR ===");

  await prisma.negocio.updateMany({
    where: { slug: { in: ['demo-canchas', 'complejo-test'] } },
    data: {
      precioHora: 25,
    },
  });

  await prisma.service.updateMany({
    where: { precio: { gte: 1000 } },
    data: {
      precio: 25,
    },
  });

  console.log("✅ Precios de canchas ajustados a $25 USD exitosamente");
}

fixUsdPrices().catch(console.error).finally(() => process.exit(0));
