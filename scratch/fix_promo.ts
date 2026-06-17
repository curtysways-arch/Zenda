import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

async function main() {
  const libsqlUrl = 'file:///' + path.resolve(process.cwd(), 'dev.db').replace(/\\/g, '/');
  const adapter = new PrismaLibSql({ url: libsqlUrl });
  const prisma = new PrismaClient({ adapter });

  console.log('Server Date now:', new Date().toISOString());

  const promo = await prisma.promotion.findUnique({
    where: { id: '4ffdc8db-cc0a-48dd-9031-cf37e89fa568' }
  });

  if (promo) {
    console.log('Promo fechaFin:', promo.fechaFin.toISOString());
    console.log('¿fechaFin < now?:', promo.fechaFin < new Date());
    
    // Cambiar a activa para ver si aparece
    const updated = await prisma.promotion.update({
      where: { id: promo.id },
      data: { estado: 'activa' }
    });
    console.log('Promo actualizada a:', updated.estado);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
