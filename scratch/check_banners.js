const prisma = require('../src/lib/prisma').default;

async function main() {
  const images = await prisma.imagen.findMany({
    where: {
      OR: [
        { esBanner: true },
        { tipo: 'BANNER' }
      ]
    },
    include: {
      Negocio: {
        select: {
          id: true,
          nombre: true,
          slug: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log('Total banner images in DB:', images.length);
  const byBusiness = {};
  images.forEach(img => {
    const key = `${img.Negocio?.nombre || 'Desconocido'} (${img.negocioId}, slug: ${img.Negocio?.slug || 'n/a'})`;
    if (!byBusiness[key]) byBusiness[key] = [];
    byBusiness[key].push({
      id: img.id,
      url: img.url,
      esBanner: img.esBanner,
      tipo: img.tipo,
      createdAt: img.createdAt
    });
  });

  console.log(JSON.stringify(byBusiness, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect?.());
