const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const path = require('path');

const dbPath = path.resolve(__dirname, '../prisma/dev.db').replace(/\\/g, '/');
const libsqlUrl = `file:///${dbPath}`;

const adapter = new PrismaLibSql({ url: libsqlUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- NEGOCIOS ---');
  const negocios = await prisma.negocio.findMany({
    select: { id: true, nombre: true, slug: true, whatsapp: true }
  });
  negocios.forEach(n => console.log(`ID: ${n.id} | Slug: ${n.slug} | Tel: ${n.whatsapp}`));

  console.log('\n--- USUARIOS (ADMINS) ---');
  const users = await prisma.usuario.findMany({
    where: { role: 'BUSINESS_OWNER' },
    select: { id: true, nombre: true, phone: true, negocioId: true, whatsapp_notifications: true }
  });
  users.forEach(u => console.log(`ID: ${u.id} | Name: ${u.nombre} | Tel: ${u.phone} | NegocioId: ${u.negocioId} | WA_Notif: ${u.whatsapp_notifications}`));

  await prisma.$disconnect();
}

main().catch(console.error);
