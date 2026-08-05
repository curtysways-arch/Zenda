import prisma from './lib/prisma';

async function fixPages() {
  const pages = await prisma.page.findMany();
  console.log('Páginas actuales:', JSON.stringify(pages.map(p => ({ id: p.id, title: p.title, slug: p.slug, businessId: p.businessId })), null, 2));

  // Actualizar todas las páginas para asegurar que sus slugs sean 'por-que-elegirnos' y 'como-funciona'
  for (const page of pages) {
    let newSlug = page.slug;
    if (page.title.toLowerCase().includes('elegirnos') || page.title.toLowerCase().includes('resultados')) {
      newSlug = 'por-que-elegirnos';
    } else if (page.title.toLowerCase().includes('funciona')) {
      newSlug = 'como-funciona';
    }

    if (newSlug !== page.slug || page.status !== 'published') {
      await prisma.page.update({
        where: { id: page.id },
        data: { slug: newSlug, status: 'published' }
      });
      console.log('Página actualizada:', page.id, '-> Nuevo slug:', newSlug);
    }
  }
}

fixPages()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
