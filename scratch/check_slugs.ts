import prisma from '../src/lib/prisma';

async function main() {
  const negocios = await prisma.negocio.findMany({
    select: { id: true, nombre: true, slug: true, isDemo: true, configuracion: true },
  });

  console.log("=== NEGOCIOS EN LA BASE DE DATOS ===");
  negocios.forEach((n) => {
    console.log(`- Slug: /${n.slug} | Nombre: ${n.nombre} | ID: ${n.id} | isDemo: ${n.isDemo}`);
  });
}

main().catch(console.error).finally(() => process.exit(0));
