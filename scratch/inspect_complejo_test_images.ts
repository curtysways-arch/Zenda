import prisma from '../src/lib/prisma';

async function inspectComplejoTest() {
  console.log("=== IMÁGENES CONFIGURADAS EN COMPLEJO-TEST ===");

  const negocio = await (prisma as any).negocio.findUnique({
    where: { slug: 'complejo-test' },
    include: {
      Imagen: true,
      Service: {
        include: {
          Imagen: true
        }
      }
    }
  });

  console.log("Negocio id:", negocio?.id);
  console.log("Negocio imagenes (Imagen table):", JSON.stringify(negocio?.Imagen, null, 2));

  // Verificar si hay imagenes en Service (canchas)
  const serviceImages: any[] = [];
  negocio?.Service?.forEach((s: any) => {
    if (s.Imagen && s.Imagen.length > 0) {
      serviceImages.push(...s.Imagen);
    }
  });
  console.log("Service imagenes (canchas):", JSON.stringify(serviceImages, null, 2));
}

inspectComplejoTest().catch(console.error).finally(() => process.exit(0));
