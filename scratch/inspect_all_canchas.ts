import prisma from '../src/lib/prisma';

async function inspectAllCanchas() {
  console.log("=== INSPECCIONANDO TODAS LAS CANCHAS EN LA BASE DE DATOS ===");

  const servicios = await prisma.service.findMany({
    include: {
      Negocio: true
    }
  });

  console.log(`Total servicios/canchas: ${servicios.length}`);
  servicios.forEach((s: any) => {
    console.log(`- ID: ${s.id} | Nombre: ${s.nombre} | Precio: ${s.precio} | Negocio: ${s.Negocio?.nombre} (${s.Negocio?.slug} / ${s.negocioId}) | estaActivo: ${s.estaActivo}`);
  });
}

inspectAllCanchas().catch(console.error).finally(() => process.exit(0));
