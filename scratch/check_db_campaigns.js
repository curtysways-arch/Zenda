const prisma = require('./src/lib/prisma').default;

async function main() {
    const campaigns = await prisma.clientGlobalCampaign.findMany();
    console.log("CLIENT GLOBAL CAMPAIGNS:");
    console.dir(campaigns, { depth: null });
    
    const quests = await prisma.quest.findMany();
    console.log("\nQUESTS:");
    console.dir(quests, { depth: null });

    const logs = await prisma.questEventLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    console.log("\nRECENT QUEST EVENT LOGS:");
    console.dir(logs, { depth: null });

    await prisma.$disconnect();
}

main().catch(console.error);
