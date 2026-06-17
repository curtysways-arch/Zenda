const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db',
    },
  },
});

async function main() {
  const negocio = await prisma.negocio.findFirst();
  console.log('SLUG:' + negocio.slug);
  await prisma.$disconnect();
}

main().catch(console.error);
