import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

async function main() {
  const libsqlUrl = 'file:///' + path.resolve(process.cwd(), 'dev.db').replace(/\\/g, '/');
  const adapter = new PrismaLibSql({ url: libsqlUrl });
  const prisma = new PrismaClient({ adapter });

  const promos = await prisma.promotion.findMany();
  console.log('Todas las promociones:', JSON.stringify(promos, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
