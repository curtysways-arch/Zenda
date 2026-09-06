import { prisma } from '../lib/prisma';

async function main() {
    const plans = await prisma.plan.findMany({
        where: { name: { contains: 'Restaurante' } },
        include: {
            planEntitlements: {
                include: { module: true }
            }
        }
    });

    for (const p of plans) {
        console.log(`\n================== PLAN: ${p.name} (id: ${p.id}) ==================`);
        console.log(`Total Entitlements en BD: ${p.planEntitlements.length}`);
        for (const pe of p.planEntitlements) {
            console.log(`- enabled: ${pe.enabled} | moduleId: ${pe.moduleId} | module exists: ${!!pe.module} | module.name: "${pe.module?.name}" | module.code: "${pe.module?.code}"`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
