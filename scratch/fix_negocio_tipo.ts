import prisma from '../src/lib/prisma';

async function fixNegocioTipo() {
  await prisma.negocio.update({
    where: { slug: 'demo-canchas' },
    data: {
      tipoNegocio: 'SPORTS_COURTS',
      configuracion: {
        tipoNegocio: 'SPORTS_COURTS',
        wizardCompleted: true,
      } as any,
    },
  });

  await prisma.usuario.updateMany({
    where: { email: 'admin@democanchas.com' },
    data: {
      tipoNegocio: 'SPORTS_COURTS',
    },
  });

  console.log("✅ Negocio demo-canchas actualizado a SPORTS_COURTS en base de datos");
}

fixNegocioTipo().catch(console.error).finally(() => process.exit(0));
