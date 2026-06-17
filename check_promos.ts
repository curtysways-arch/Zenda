import prisma from './src/lib/prisma';

async function main() {
    const promos = await prisma.promotion.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(promos, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
