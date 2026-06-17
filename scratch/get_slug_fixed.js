const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const path = require('path');

const dbPath = path.resolve(__dirname, '../prisma/dev.db').replace(/\\/g, '/');
const libsqlUrl = `file:///${dbPath}`;

const adapter = new PrismaLibSql({ url: libsqlUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const negocio = await prisma.negocio.findFirst();
  if (negocio) {
    console.log('SLUG:' + negocio.slug);
    console.log('ID:' + negocio.id);
  } else {
    console.log('No business found');
  }
  await prisma.$disconnect();
}

main().catch(console.error);
