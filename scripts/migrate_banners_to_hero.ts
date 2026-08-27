import prisma from '../src/lib/prisma';

/**
 * MIGRACIÓN UNIVERSAL Y DINÁMICA DE BANNERS A HEROITEM
 * 
 * Reglas de ejecución:
 * 1. Descubre dinámicamente todos los negocios y registros `Imagen` legacy (esBanner: true o tipo: 'BANNER') en cualquier BD (DEV / STAGING / PROD).
 * 2. NO tiene IDs ni nombres fijos hardcodeados.
 * 3. Es completamente IDEMPOTENTE (se puede ejecutar múltiples veces sin duplicar registros).
 * 4. NO elimina ningún registro de la tabla `Imagen`.
 * 5. NO modifica negocios que no posean banners legacy.
 * 6. NO se ejecuta automáticamente en builds/deployments; debe ser invocado explícitamente en el entorno correspondiente.
 * 
 * Uso: npx tsx scripts/migrate_banners_to_hero.ts
 */
async function migrateBannersToHero() {
  console.log('🚀 Iniciando migración universal de banners legacy a HeroItem...');

  // 1. Descubrir todos los negocios del entorno de forma dinámica
  const negocios = await prisma.negocio.findMany({
    select: { id: true, nombre: true, slug: true, configuracion: true }
  });

  let totalMigrados = 0;
  let negociosProcesados = 0;

  for (const neg of negocios) {
    // 2. Buscar imágenes legacy de tipo BANNER para el negocio actual
    const legacyImages = await prisma.imagen.findMany({
      where: {
        negocioId: neg.id,
        OR: [
          { esBanner: true },
          { tipo: 'BANNER' }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    let bannerUrls: string[] = legacyImages
      .map(img => img.url)
      .filter(u => u && typeof u === 'string' && u.trim() !== '');

    // 3. Fallback defensivo a configuracion JSON si no existen registros en la tabla Imagen
    if (bannerUrls.length === 0 && neg.configuracion) {
      let cfg: any = {};
      if (typeof neg.configuracion === 'string') {
        try { cfg = JSON.parse(neg.configuracion); } catch {}
      } else {
        cfg = neg.configuracion;
      }

      if (Array.isArray(cfg.bannerUrls) && cfg.bannerUrls.length > 0) {
        bannerUrls = cfg.bannerUrls.filter((u: any) => typeof u === 'string' && u.trim() !== '');
      } else if (typeof cfg.bannerUrl === 'string' && cfg.bannerUrl.trim() !== '') {
        bannerUrls = [cfg.bannerUrl.trim()];
      }
    }

    // Si el negocio no tiene banners legacy, no se realiza ninguna modificación
    if (bannerUrls.length === 0) continue;

    negociosProcesados++;
    console.log(`📌 Negocio "${neg.nombre}" (ID: ${neg.id}): Procesando ${bannerUrls.length} banners...`);

    let position = 0;
    for (const url of bannerUrls) {
      // 4. Verificación estricta de idempotencia para evitar duplicados
      const existing = await prisma.heroItem.findFirst({
        where: {
          businessId: neg.id,
          image: url
        }
      });

      if (!existing) {
        await prisma.heroItem.create({
          data: {
            businessId: neg.id,
            type: 'IMAGE',
            sourceType: 'CUSTOM',
            sourceId: null,
            image: url,
            mobileImage: null,
            title: null,
            description: null,
            buttonEnabled: false,
            buttonText: null,
            actionType: 'NONE',
            actionValue: null,
            isActive: true,
            position,
            priority: 1
          }
        });
        totalMigrados++;
        console.log(`   ✓ Creado HeroItem #${position + 1} para: ${url}`);
      } else {
        console.log(`   - [Idempotente] Ya existe HeroItem #${position + 1} para: ${url}`);
      }
      position++;
    }
  }

  console.log(`\n✅ Resumen de migración: ${negociosProcesados} negocios procesados, ${totalMigrados} nuevos registros HeroItem creados.`);
}

migrateBannersToHero()
  .catch((err) => {
    console.error('❌ Error durante la migración:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect?.();
  });
