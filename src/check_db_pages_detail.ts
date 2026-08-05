import prisma from './lib/prisma';

async function main() {
  const pages = await prisma.page.findMany();
  console.log('TOTAL_PAGINAS:', pages.length);
  for (const p of pages) {
    console.log('=== PAGE ===');
    console.log('ID:', p.id);
    console.log('TITLE:', p.title);
    console.log('SLUG:', p.slug);
    console.log('STATUS:', p.status);
    console.log('BUSINESS_ID:', p.businessId);
    console.log('CONTENT_HTML_LEN:', p.contentHtml?.length);
    console.log('CONTENT_HTML_SAMPLE:', p.contentHtml?.substring(0, 200));
  }

  const negocios = await prisma.negocio.findMany();
  console.log('=== NEGOCIOS ===');
  negocios.forEach(n => console.log({ id: n.id, nombre: n.nombre, slug: n.slug, tipoNegocio: n.tipoNegocio }));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
