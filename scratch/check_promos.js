const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany({
    where: { name: { contains: 'Masaje' } },
    include: {
      PromotionToService: {
        include: {
          Promotion: true
        }
      }
    }
  });

  console.log('--- SERVICIOS Y PROMOCIONES ---');
  services.forEach(s => {
    console.log(`Servicio: ${s.name} (ID: ${s.id})`);
    if (s.PromotionToService.length === 0) {
      console.log('  Sin promociones vinculadas.');
    } else {
      s.PromotionToService.forEach(rel => {
        const p = rel.Promotion;
        console.log(`  Promo: ${p.titulo} (ID: ${p.id})`);
        console.log(`    Precio Promo: ${p.precioPromo}`);
        console.log(`    Estado: ${p.estado}`);
        console.log(`    Fechas: ${p.fechaInicio} a ${p.fechaFin}`);
        console.log(`    Horario: ${p.horaInicioValida} a ${p.horaFinValida}`);
      });
    }
  });

  const allPromos = await prisma.promotion.findMany();
  console.log('\n--- TODAS LAS PROMOCIONES EN DB ---');
  allPromos.forEach(p => {
    console.log(`Promo: ${p.titulo} (${p.id}) - Estado: ${p.estado} - Precio: ${p.precioPromo}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
