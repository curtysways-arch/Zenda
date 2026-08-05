import prisma from '../src/lib/prisma';
import crypto from 'crypto';

async function seedBannerImages() {
  const negocioId = 'sneaker-wash-id';

  const banners = [
    '/images/bubblewash/hero_sneakers.jpg',
    '/images/bubblewash/store_front.jpg',
    '/images/bubblewash/delivery_driver.jpg'
  ];

  for (const url of banners) {
    const existing = await prisma.imagen.findFirst({
      where: {
        negocioId,
        url,
        tipo: 'BANNER'
      }
    });

    if (!existing) {
      await prisma.imagen.create({
        data: {
          id: `img_banner_${crypto.randomUUID()}`,
          url,
          tipo: 'BANNER',
          esBanner: true,
          negocioId,
          createdAt: new Date()
        }
      });
      console.log('✅ Imagen de portada añadida:', url);
    }
  }

  // Actualizar Negocio logoUrl y configuracion
  await prisma.negocio.update({
    where: { id: negocioId },
    data: {
      logoUrl: '/images/bubblewash/hero_sneakers.jpg',
      configuracion: {
        bannerUrl: '/images/bubblewash/hero_sneakers.jpg',
        tipoNegocio: 'SHOE_CARE'
      }
    }
  });

  console.log('✅ Portadas del negocio registradas con éxito.');
}

seedBannerImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
