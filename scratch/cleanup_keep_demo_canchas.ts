import prisma from '../src/lib/prisma';

async function cleanupKeepDemoCanchas() {
  console.log("=== LIMPIANDO Y DEJAN DO UNICAMENTE DEMO-CANCHAS ===");

  const demoCanchas = await prisma.negocio.findUnique({ where: { slug: 'demo-canchas' } });
  const complejoTest = await prisma.negocio.findUnique({ where: { slug: 'complejo-test' } });

  if (!demoCanchas) {
    console.error("No se encontró el negocio demo-canchas");
    return;
  }

  if (complejoTest) {
    // Si complejoTest tiene imágenes de banner, pasárselas a demoCanchas
    const imagenesComplejo = await prisma.imagen.findMany({ where: { negocioId: complejoTest.id } });
    for (const img of imagenesComplejo) {
      const exists = await prisma.imagen.findFirst({ where: { negocioId: demoCanchas.id, url: img.url } });
      if (!exists) {
        await prisma.imagen.create({
          data: {
            id: `img-demo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            negocioId: demoCanchas.id,
            url: img.url,
            tipo: img.tipo || 'BANNER',
            esBanner: true
          }
        });
      }
    }

    // Eliminar relaciones de complejoTest
    await prisma.service.deleteMany({ where: { negocioId: complejoTest.id } });
    await prisma.imagen.deleteMany({ where: { negocioId: complejoTest.id } });
    await prisma.suscripcion.deleteMany({ where: { negocioId: complejoTest.id } });
    await prisma.negocio.delete({ where: { id: complejoTest.id } });

    console.log("✅ Negocio 'complejo-test' eliminado correctamente.");
  }

  // Asegurar la mejor configuración para demo-canchas
  await prisma.negocio.update({
    where: { id: demoCanchas.id },
    data: {
      nombre: 'Complejo Deportivo El Dorado',
      colorPrimario: '#059669',
      colorSecundario: '#022c22',
      tipoNegocio: 'SPORTS_COURTS',
      configuracion: JSON.stringify({
        tipoNegocio: 'SPORTS_COURTS',
        currency: 'USD',
        timeZone: 'America/Guayaquil',
        diasAtencion: [0, 1, 2, 3, 4, 5, 6]
      })
    }
  });

  console.log("✅ Negocio 'demo-canchas' configurado como la única referencia oficial.");
}

cleanupKeepDemoCanchas().catch(console.error).finally(() => process.exit(0));
