import prisma from '@/lib/prisma';
import { storageService } from '@/lib/storage/storageService';

/**
 * Script de migración de URLs de imágenes legadas a la tabla `Media`.
 *
 * - Busca campos `imagenUrl` (Promotion) y `featuredImage` (Page) que contengan URLs.
 * - Crea un registro Media con `provider='external'` y conserva la URL original.
 * - Actualiza la relación `imageMediaId` del registro correspondiente.
 * - Opcionalmente elimina el registro Media antiguo si ya no se usa.
 *
 * Ejecutar con: `node src/scripts/migrateLegacyImages.ts`
 */
async function migratePromotionImages() {
  const promotions = await prisma.promotion.findMany({
    where: { imagenUrl: { not: null } },
    select: { id: true, businessId: true, imagenUrl: true },
  });

  for (const promo of promotions) {
    if (!promo.imagenUrl) continue;
    // Crear Media si no existe ya para esta URL
    let media = await prisma.media.findFirst({
      where: { url: promo.imagenUrl },
    });
    if (!media) {
      media = await prisma.media.create({
        data: {
          businessId: promo.businessId,
          url: promo.imagenUrl,
          fileKey: promo.imagenUrl, // conservamos la URL como key
          provider: 'external',
          mimeType: 'image/webp', // asumimos webp o deja genérico
          size: 0,
          category: 'promotion',
        },
      });
    }
    // Vincular Media al Promotion
    await prisma.promotion.update({
      where: { id: promo.id },
      data: { imageMediaId: media.id },
    });
    console.log(`Promotion ${promo.id} migrada a Media ${media.id}`);
  }
}

async function migratePageImages() {
  const pages = await prisma.page.findMany({
    where: { featuredImage: { not: null } },
    select: { id: true, businessId: true, featuredImage: true },
  });

  for (const page of pages) {
    if (!page.featuredImage) continue;
    let media = await prisma.media.findFirst({
      where: { url: page.featuredImage },
    });
    if (!media) {
      media = await prisma.media.create({
        data: {
          businessId: page.businessId,
          url: page.featuredImage,
          fileKey: page.featuredImage,
          provider: 'external',
          mimeType: 'image/webp',
          size: 0,
          category: 'page',
        },
      });
    }
    await prisma.page.update({
      where: { id: page.id },
      data: { imageMediaId: media.id },
    });
    console.log(`Page ${page.id} migrada a Media ${media.id}`);
  }
}

async function main() {
  console.log('Iniciando migración de imágenes legadas...');
  await migratePromotionImages();
  await migratePageImages();
  console.log('Migración completada.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
