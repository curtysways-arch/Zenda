import prisma from '../src/lib/prisma';

async function checkImages() {
  console.log("=== INSPECCIONANDO TABLA IMAGEN ===");
  const imagenes = await (prisma as any).imagen.findMany();
  console.log("Total imagenes encontradas:", imagenes.length);
  console.log(JSON.stringify(imagenes, null, 2));

  const negocios = await prisma.negocio.findMany({
    select: { id: true, slug: true, nombre: true }
  });
  console.log("Negocios:", JSON.stringify(negocios, null, 2));
}

checkImages().catch(console.error).finally(() => process.exit(0));
