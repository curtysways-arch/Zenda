import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

async function main() {
  const libsqlUrl = 'file:///' + path.resolve(process.cwd(), 'dev.db').replace(/\\/g, '/');
  const adapter = new PrismaLibSql({ url: libsqlUrl });
  const prisma = new PrismaClient({ adapter });

  const negocioId = 'cmmlfry6q0004l0w54cdbpyx9';
  const now = new Date();
  
  const rawPromocionesActivas = await prisma.promotion.findMany({
    where: { 
      businessId: negocioId, 
      estado: 'activa', 
      fechaInicio: { lte: now }, 
      fechaFin: { gte: now } 
    },
    include: { PromotionToService: { include: { Service: true } } },
    orderBy: { createdAt: 'desc' }
  });

  console.log('Promociones encontradas para el home:', rawPromocionesActivas.length);
  rawPromocionesActivas.forEach(p => {
    console.log(`- ${p.titulo} (ID: ${p.id}, Estado: ${p.estado})`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
