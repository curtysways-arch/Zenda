/**
 * Seed: Habilitar capability 'delivery' en negocios BubbleWash (SHOE_CARE)
 * 
 * Uso: npx tsx src/scripts/seed_delivery_capability.ts
 */

import prisma from '../lib/prisma';

async function main() {
  console.log('🔍 Buscando negocios SHOE_CARE...');
  
  const negocios = await prisma.negocio.findMany({
    where: {
      OR: [
        { tipoNegocio: 'SHOE_CARE' },
        { tipoNegocio: 'ordenes-servicio' },
        { tipoNegocio: 'PRODUCTOS' },
      ],
    },
    select: { id: true, nombre: true, tipoNegocio: true, configuracion: true },
  });

  console.log(`📋 Encontrados ${negocios.length} negocios relevantes`);

  for (const negocio of negocios) {
    let config: any = {};
    if (typeof negocio.configuracion === 'string') {
      try { config = JSON.parse(negocio.configuracion as string); } catch { config = {}; }
    } else {
      config = (negocio.configuracion as any) || {};
    }

    // Agregar capability delivery
    const updatedConfig = {
      ...config,
      capabilities: {
        ...(config.capabilities || {}),
        delivery: true,
      },
    };

    await prisma.negocio.update({
      where: { id: negocio.id },
      data: { configuracion: updatedConfig as any },
    });

    console.log(`✅ ${negocio.nombre} (${negocio.tipoNegocio}) → delivery: true`);
  }

  console.log('\n🎉 Seed completado. Recarga el panel de administración.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
