import prisma from './lib/prisma';

async function main() {
  const pages = await prisma.page.findMany();
  console.log('TOTAL_PAGINAS:', pages.length);
  pages.forEach(p => {
    console.log('DETALLE:', { id: p.id, title: p.title, slug: p.slug, status: p.status, businessId: p.businessId });
  });
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
