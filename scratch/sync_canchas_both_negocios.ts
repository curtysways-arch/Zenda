import prisma from '../src/lib/prisma';
import crypto from 'crypto';

async function syncCanchasBoth() {
  console.log("=== SINCRONIZANDO CANCHAS ENTRE DEMO-CANCHAS Y COMPLEJO-TEST ===");

  const canchasData = [
    {
      nombre: 'Futboll (Sintético)',
      precio: 25,
      duracion: 90,
      extraInfo: { tipo: 'FÚTBOL SINTÉTICO', capacidad: 22 }
    },
    {
      nombre: 'Reserva Cancha Pádel 90 Min',
      precio: 25,
      duracion: 90,
      extraInfo: { tipo: 'PÁDEL CRISTAL', capacidad: 4 }
    },
    {
      nombre: 'Cancha Central Pádel Cristal',
      precio: 25,
      duracion: 90,
      extraInfo: { tipo: 'PÁDEL CRISTAL', capacidad: 4 }
    }
  ];

  const slugs = ['demo-canchas', 'complejo-test'];

  for (const slug of slugs) {
    const negocio = await prisma.negocio.findUnique({ where: { slug } });
    if (negocio) {
      // Limpiar canchas viejas
      await prisma.service.deleteMany({ where: { negocioId: negocio.id } });

      for (const c of canchasData) {
        await prisma.service.create({
          data: {
            id: `cancha-${slug}-${crypto.randomUUID().substring(0, 8)}`,
            nombre: c.nombre,
            precio: c.precio,
            duracion: c.duracion,
            estaActivo: true,
            negocioId: negocio.id,
            updatedAt: new Date(),
            extraInfo: c.extraInfo
          }
        });
      }
      console.log(`✅ Sincronizadas 3 canchas para negocio ${slug}`);
    }
  }
}

syncCanchasBoth().catch(console.error).finally(() => process.exit(0));
