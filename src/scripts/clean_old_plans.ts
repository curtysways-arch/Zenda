import prisma from '../lib/prisma';

async function main() {
  const vortex = await prisma.negocio.findUnique({
    where: { slug: 'vortex-fitness' },
    select: { id: true }
  });
  if (!vortex) return;

  await (prisma as any).membershipPlan.updateMany({
    where: {
      businessId: vortex.id,
      name: { in: ['Mensual', 'Trimestral', 'Anual'] }
    },
    data: { active: false, isActive: false }
  });

  const activePlans = await (prisma as any).membershipPlan.findMany({
    where: { businessId: vortex.id, active: true },
    orderBy: { displayOrder: 'asc' }
  });

  console.log(`Planes activos filtrados (${activePlans.length}):`);
  activePlans.forEach((p: any) => console.log(`- ${p.name} ($${p.price}, ${p.durationDays}d, featured: ${p.featured})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
