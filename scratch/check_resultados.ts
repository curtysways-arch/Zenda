
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const resultados = await prisma.resultado.findMany({
    include: {
      service: true,
      staff: true
    }
  });
  console.log(JSON.stringify(resultados, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
