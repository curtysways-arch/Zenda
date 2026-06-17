import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

async function main() {
  const libsqlUrl = 'file:///' + path.resolve(process.cwd(), 'dev.db').replace(/\\/g, '/');
  const adapter = new PrismaLibSql({ url: libsqlUrl });
  const prisma = new PrismaClient({ adapter });

  const service = await prisma.service.findUnique({
    where: { id: 'serv-1' }
  });
  console.log('Service:', JSON.stringify(service, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
