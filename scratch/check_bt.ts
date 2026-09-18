import prisma from '../src/lib/prisma';

async function main() {
  const bts = await (prisma as any).businessType.findMany();
  console.log('=== BUSINESS TYPES ===');
  console.log(JSON.stringify(bts, null, 2));

  const pfs = await (prisma as any).planFamily.findMany();
  console.log('=== PLAN FAMILIES ===');
  console.log(JSON.stringify(pfs, null, 2));

  // Also check vortex-fitness:
  const vortex = await (prisma as any).negocio.findUnique({
    where: { slug: 'vortex-fitness' },
    include: { BusinessType: true, Suscripcion: { include: { Plan: true } } }
  });
  console.log('=== VORTEX FITNESS ===');
  console.log(JSON.stringify(vortex, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
