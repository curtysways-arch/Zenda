import prisma from '../src/lib/prisma';

async function main() {
    try {
        const campaigns = await prisma.campaign.findMany({
            include: { Quests: true }
        });
        console.log("CAMPAIGNS AND QUESTS:");
        console.log(JSON.stringify(campaigns, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
