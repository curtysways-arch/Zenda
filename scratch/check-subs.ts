import prisma from '../src/lib/prisma';

async function main() {
  const suscripciones = await prisma.suscripcion.findMany({
    include: {
      Plan: true,
      Negocio: true
    }
  });

  console.log('--- SUSCRIPCIONES ACTUALES ---');
  for (const s of suscripciones) {
    console.log(`Negocio: ${s.Negocio?.nombre} (ID: ${s.negocioId})`);
    console.log(`  Plan: ${s.Plan?.name} (ID: ${s.planId})`);
    console.log(`  Estado: ${s.estado}`);
    console.log(`  Fecha Fin: ${s.fechaFin}`);
  }

  const planes = await prisma.plan.findMany();
  console.log('\n--- PLANES EN LA DB ---');
  for (const p of planes) {
    console.log(`Plan: ${p.name} (ID: ${p.id}) - Precio: ${p.price}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
