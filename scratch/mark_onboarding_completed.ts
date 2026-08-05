import prisma from '../src/lib/prisma';

async function markOnboardingCompleted() {
  console.log("=== MARCANDO WIZARD COMPLETED = TRUE PARA TODOS LOS NEGOCIOS ===");

  const negocios = await prisma.negocio.findMany();

  for (const neg of negocios) {
    let config: any = {};
    try {
      if (typeof neg.configuracion === 'string') {
        config = JSON.parse(neg.configuracion);
      } else if (neg.configuracion) {
        config = neg.configuracion;
      }
    } catch {
      config = {};
    }

    config.wizardCompleted = true;

    await prisma.negocio.update({
      where: { id: neg.id },
      data: {
        configuracion: JSON.stringify(config)
      }
    });

    console.log(`✅ Negocio ${neg.nombre} (${neg.slug}) marcado con wizardCompleted = true`);
  }
}

markOnboardingCompleted().catch(console.error).finally(() => process.exit(0));
