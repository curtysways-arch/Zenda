import prisma from '../src/lib/prisma';
import crypto from 'crypto';

async function syncUploadedImages() {
  console.log("=== SINCRONIZANDO IMÁGENES CARGADAS ENTRE DEMO-CANCHAS Y COMPLEJO-TEST ===");

  const demoImages = await (prisma as any).imagen.findMany({
    where: { negocioId: 'demo-canchas-id-100' }
  });

  for (const img of demoImages) {
    const existing = await (prisma as any).imagen.findFirst({
      where: {
        negocioId: 'complejo-test-id-101',
        url: img.url
      }
    });

    if (!existing) {
      await (prisma as any).imagen.create({
        data: {
          id: crypto.randomUUID(),
          url: img.url,
          tipo: 'BANNER',
          negocioId: 'complejo-test-id-101',
          esBanner: true,
        }
      });
      console.log(`✅ Imagen copiada a complejo-test: ${img.url}`);
    }
  }
}

syncUploadedImages().catch(console.error).finally(() => process.exit(0));
