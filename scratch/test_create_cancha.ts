import prisma from '../src/lib/prisma';
import crypto from 'crypto';

async function testCreateCancha() {
  console.log("=== PROBANDO CREACIÓN DE CANCHA EN MODELO SERVICE ===");

  const negocio = await prisma.negocio.findFirst({ where: { slug: 'complejo-test' } });
  if (!negocio) {
    console.error("Negocio no encontrado");
    return;
  }

  const newCancha = await prisma.service.create({
    data: {
      id: `cancha-${Date.now()}`,
      nombre: 'Cancha 1 - Fútbol Sintético',
      duracion: 90,
      precio: 25,
      estaActivo: true,
      negocioId: negocio.id,
      updatedAt: new Date(),
      extraInfo: {
        tipo: 'FÚTBOL SINTÉTICO',
        capacidad: 22
      }
    }
  });

  console.log("✅ Cancha creada exitosamente:", newCancha);
}

testCreateCancha().catch(console.error).finally(() => process.exit(0));
