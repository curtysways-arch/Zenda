import prisma from '../src/lib/prisma';
import crypto from 'crypto';

async function setComplejoTestSportsImages() {
  console.log("=== CONFIGURANDO IMÁGENES DEPORTIVAS DE ALTA CALIDAD PARA CANCHA COMPLEJO TEST ===");

  const negocio = await prisma.negocio.findUnique({
    where: { slug: 'complejo-test' }
  });

  if (!negocio) {
    console.error("Negocio complejo-test no encontrado");
    return;
  }

  // 1. Limpiar imágenes previas irrelevantes de complejo-test
  await (prisma as any).imagen.deleteMany({
    where: { negocioId: negocio.id }
  });

  // 2. Insertar las imágenes de canchas deportivas de alto nivel
  const sportsImages = [
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=1200', // Pádel Cristal
    'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&q=80&w=1200', // Fútbol Sintético
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1200'  // Tenis / Pádel Noche
  ];

  for (const url of sportsImages) {
    await (prisma as any).imagen.create({
      data: {
        id: crypto.randomUUID(),
        url,
        tipo: 'BANNER',
        negocioId: negocio.id,
        esBanner: true,
      }
    });
  }

  // 3. Actualizar configuracion JSON en Negocio
  await prisma.negocio.update({
    where: { id: negocio.id },
    data: {
      configuracion: {
        ...(negocio.configuracion as any || {}),
        bannerUrl: sportsImages[0]
      } as any
    }
  });

  console.log("✅ Imágenes deportivas de Canchas configuradas exitosamente para complejo-test");
}

setComplejoTestSportsImages().catch(console.error).finally(() => process.exit(0));
