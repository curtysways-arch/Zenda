import prisma from '../src/lib/prisma';

async function main() {
  console.log('🔄 Sincronizando suscripciones y eliminando el plan antiguo...');

  // 1. Encontrar todos los negocios que usan 'plan-pro'
  const suscripcionesProAnteriores = await prisma.suscripcion.findMany({
    where: {
      planId: 'plan-pro'
    }
  });

  console.log(`Negocios encontrados con plan 'plan-pro': ${suscripcionesProAnteriores.length}`);

  // 2. Moverlos al nuevo 'plan_pro'
  for (const sub of suscripcionesProAnteriores) {
    console.log(`Migrando negocio ${sub.negocioId} al nuevo plan 'plan_pro'...`);
    await prisma.suscripcion.update({
      where: {
        id: sub.id
      },
      data: {
        planId: 'plan_pro'
      }
    });

    // También actualizar en SubscriptionHistory si hay registros
    await prisma.subscriptionHistory.updateMany({
      where: {
        plan_nuevo_id: 'plan-pro'
      },
      data: {
        plan_nuevo_id: 'plan_pro'
      }
    });

    await prisma.subscriptionHistory.updateMany({
      where: {
        plan_anterior_id: 'plan-pro'
      },
      data: {
        plan_anterior_id: 'plan_pro'
      }
    });
  }

  // 3. Eliminar el plan 'plan-pro' de la base de datos
  console.log("Eliminando el plan antiguo 'plan-pro'...");
  try {
    await prisma.plan.delete({
      where: {
        id: 'plan-pro'
      }
    });
    console.log("✅ Plan 'plan-pro' eliminado exitosamente.");
  } catch (error) {
    console.error("Error al intentar eliminar 'plan-pro':", error);
  }

  console.log('🚀 Migración y limpieza terminada.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
