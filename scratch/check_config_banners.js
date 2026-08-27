const prisma = require('../src/lib/prisma').default;

async function main() {
  const businesses = await prisma.negocio.findMany({
    select: {
      id: true,
      nombre: true,
      slug: true,
      configuracion: true
    }
  });

  const configBanners = [];
  businesses.forEach(b => {
    let cfg = {};
    if (b.configuracion) {
      if (typeof b.configuracion === 'string') {
        try { cfg = JSON.parse(b.configuracion); } catch {}
      } else {
        cfg = b.configuracion;
      }
    }
    if (cfg.bannerUrl || cfg.bannerUrls || cfg.heroImages) {
      configBanners.push({
        id: b.id,
        nombre: b.nombre,
        slug: b.slug,
        bannerUrl: cfg.bannerUrl,
        bannerUrls: cfg.bannerUrls
      });
    }
  });

  console.log('Businesses with config banners:', JSON.stringify(configBanners, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect?.());
