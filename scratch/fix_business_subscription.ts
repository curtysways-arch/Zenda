import prisma from '../src/lib/prisma';
import crypto from 'crypto';

async function fixBusinessSubscriptions() {
  console.log("=== INSPECCIONANDO Y CREANDO PLANES Y SUSCRIPCIONES ===");

  // 1. Asegurar que existan los planes base (Basic, Pro, Elite)
  let defaultPlan = await (prisma as any).plan.findFirst({ where: { activo: true } });

  if (!defaultPlan) {
    console.log("Creando planes por defecto...");
    defaultPlan = await (prisma as any).plan.create({
      data: {
        id: 'plan-pro-canchas',
        name: 'Plan Pro Canchas & Clubes',
        price: 49,
        interval: 'monthly',
        maxStaff: 10,
        maxAppointmentsMonthly: 500,
        features: ['Canchas Ilimitadas', 'Gestión de Reservas', 'Notificaciones WhatsApp', 'Torneos & Academias'],
        activo: true,
        updatedAt: new Date(),
      }
    });
  }

  // 2. Asignar Suscripcion activa a todos los negocios que no tengan
  const negocios = await prisma.negocio.findMany({
    include: {
      Suscripcion: true
    }
  });

  for (const n of negocios) {
    if (!n.Suscripcion) {
      console.log(`Creando suscripción activa para negocio: ${n.nombre} (${n.slug})`);
      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setFullYear(fechaFin.getFullYear() + 1); // 1 año de suscripción activa

      await (prisma as any).suscripcion.create({
        data: {
          id: `sub-${n.id}`,
          negocioId: n.id,
          planId: defaultPlan.id,
          estado: 'active',
          fechaInicio,
          fechaFin,
          updatedAt: new Date(),
        }
      });
    } else {
      console.log(`Negocio ${n.slug} ya posee suscripción (${(n.Suscripcion as any).estado})`);
    }
  }

  console.log("✅ Suscripciones y planes configurados exitosamente");
}

fixBusinessSubscriptions().catch(console.error).finally(() => process.exit(0));
