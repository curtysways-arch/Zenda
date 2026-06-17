import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

async function main() {
  // Usar el dev.db de la raíz
  const libsqlUrl = 'file:///' + path.resolve(process.cwd(), 'dev.db').replace(/\\/g, '/');
  console.log('Conectando a:', libsqlUrl);
  const adapter = new PrismaLibSql({ url: libsqlUrl });
  const prisma = new PrismaClient({ adapter });

  const promos = await prisma.promotion.findMany({
    where: { titulo: { contains: 'prueba' } },
    include: { PromotionToService: true }
  });
  console.log('Resultados encontrados:', JSON.stringify(promos, null, 2));
  
  const allActive = await prisma.promotion.findMany({
    where: { estado: 'activa' },
    select: { id: true, titulo: true, fechaInicio: true, fechaFin: true, businessId: true }
  });
  console.log('Todas las activas:', JSON.stringify(allActive, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
