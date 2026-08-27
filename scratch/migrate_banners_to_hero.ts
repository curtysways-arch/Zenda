import prisma from '../src/lib/prisma';

async function migrateBannersToHero() {
  console.log('🚀 Iniciando migración idempotente de banners a HeroItem...');

  // 1. Obtener todos los negocios
  const negocios = await prisma.negocio.findMany({
    select: { id: true, nombre: true, slug: true, configuracion: true }
  });

  let totalMigrados = 0;

  for (const neg of negocios) {
    // Buscar imágenes marcadas como esBanner o tipo BANNER
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

    let bannerUrls: string[] = legacyImages.map(img => img.url).filter(u => u && u.trim() !== '');

    // Fallback de configuracion si no hay imágenes en la tabla Imagen
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

    if (bannerUrls.length === 0) continue;

    console.log(`📌 Negocio "${neg.nombre}" (${neg.id}): Procesando ${bannerUrls.length} imágenes...`);

    let position = 0;
    for (const url of bannerUrls) {
      // Verificación de idempotencia
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
        console.log(`   ✓ Creado HeroItem para imagen #${position + 1}: ${url}`);
      } else {
        console.log(`   - Ya existía HeroItem para imagen #${position + 1}: ${url}`);
      }
      position++;
    }
  }

  console.log(`✅ Migración finalizada con éxito. Se migraron ${totalMigrados} nuevos elementos Hero.`);
}

migrateBannersToHero()
  .catch((err) => {
    console.error('❌ Error durante la migración:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect?.();
  });
