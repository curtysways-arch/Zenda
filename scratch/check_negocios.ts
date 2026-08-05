import prisma from '../src/lib/prisma';

async function checkNegocios() {
  const negocios = await prisma.negocio.findMany({
    select: { id: true, nombre: true, slug: true }
  });

  console.log("🏢 NEGOCIOS REGISTRADOS EN BD:");
  console.log(JSON.stringify(negocios, null, 2));
}

checkNegocios()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
