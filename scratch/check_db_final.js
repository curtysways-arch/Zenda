
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const service = await prisma.service.findUnique({
    where: { id: 'serv-masaje-pro' },
    include: {
      PromotionToService: {
        include: {
          Promotion: true
        }
      }
    }
  });

  console.log('--- SERVICE DETAILS ---');
  console.log(JSON.stringify(service, null, 2));

  const promos = await prisma.promotion.findMany();
  console.log('--- ALL PROMOTIONS ---');
  console.log(JSON.stringify(promos, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
