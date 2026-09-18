import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- AUDITORIA DE BASE DE DATOS (dev.db) ---');

  // 1. BusinessType
  try {
    const businessTypes = await (prisma as any).businessType.findMany();
    console.log(`\n1. BusinessTypes (${businessTypes.length}):`);
    businessTypes.forEach((bt: any) => {
      console.log(`  - ID: ${bt.id}, Code: ${bt.code}, Name: ${bt.name}, Active: ${bt.active}`);
    });
  } catch (e: any) {
    console.log('Error al consultar BusinessType:', e.message);
  }

  // 2. PlanFamily
  try {
    const families = await (prisma as any).planFamily.findMany();
    console.log(`\n2. PlanFamilies (${families.length}):`);
    families.forEach((pf: any) => {
      console.log(`  - ID: ${pf.id}, Code/Slug: ${pf.slug || pf.code}, Name: ${pf.name}, BusinessTypeId: ${pf.businessTypeId}`);
    });
  } catch (e: any) {
    console.log('Error al consultar PlanFamily:', e.message);
  }

  // 3. Plans
  try {
    const plans = await (prisma as any).plan.findMany();
    console.log(`\n3. Plans (${plans.length}):`);
    plans.forEach((p: any) => {
      console.log(`  - ID: ${p.id}, Name: ${p.name}, Price: ${p.price}, FamilyId: ${p.familyId || p.planFamilyId}`);
    });
  } catch (e: any) {
    console.log('Error al consultar Plan:', e.message);
  }

  // 4. BusinessBlueprint
  try {
    const blueprints = await (prisma as any).businessBlueprint.findMany();
    console.log(`\n4. BusinessBlueprints (${blueprints.length}):`);
    blueprints.forEach((bb: any) => {
      console.log(`  - ID: ${bb.id}, Code: ${bb.code}, Slug: ${bb.slug}, Name: ${bb.name}, BusinessTypeId: ${bb.businessTypeId}`);
    });
  } catch (e: any) {
    console.log('Error al consultar BusinessBlueprint:', e.message);
  }

  // 5. BusinessModuleCatalog
  try {
    const modules = await (prisma as any).businessModuleCatalog.findMany();
    console.log(`\n5. BusinessModuleCatalog (${modules.length}):`);
    modules.forEach((m: any) => {
      console.log(`  - ID: ${m.id}, Code: ${m.code}, Name: ${m.name}`);
    });
  } catch (e: any) {
    console.log('Error al consultar BusinessModuleCatalog:', e.message);
  }

  // 6. Negocios existentes y sus tipoNegocio
  try {
    const negocios = await prisma.negocio.findMany({
      select: { id: true, nombre: true, slug: true, tipoNegocio: true, businessTypeId: true }
    });
    console.log(`\n6. Negocios existentes (${negocios.length}):`);
    negocios.forEach((n: any) => {
      console.log(`  - Slug: ${n.slug}, Nombre: ${n.nombre}, Tipo: ${n.tipoNegocio}, BTId: ${n.businessTypeId}`);
    });
  } catch (e: any) {
    console.log('Error al consultar Negocio:', e.message);
  }

  // 7. Customers / Clientes
  try {
    const clientes = await (prisma as any).cliente.findMany({ take: 5 });
    console.log(`\n7. Clientes (muestra de 5 de total):`);
    clientes.forEach((c: any) => {
      console.log(`  - ID: ${c.id}, Nombre: ${c.nombre}, Email: ${c.email}, NegocioId: ${c.negocioId}`);
    });
  } catch (e: any) {
    console.log('Error al consultar Cliente:', e.message);
  }

  // 8. Payments
  try {
    const payments = await (prisma as any).payment.findMany({ take: 5 });
    console.log(`\n8. Payments (muestra de 5):`);
    payments.forEach((p: any) => {
      console.log(`  - ID: ${p.id}, Amount: ${p.amount}, Status: ${p.status}, NegocioId: ${p.businessId || p.negocioId}`);
    });
  } catch (e: any) {
    console.log('Error al consultar Payment:', e.message);
  }
}

main().catch(console.error).finally(() => process.exit(0));
