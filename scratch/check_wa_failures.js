
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking for RetryMessages (Failed sends)...");
    const retries = await (prisma as any).retryMessage.findMany({
        take: 10,
        orderBy: { created_at: 'desc' }
    });
    console.log("RetryMessages:", JSON.stringify(retries, null, 2));

    console.log("\nChecking for BotLogs...");
    const logs = await (prisma as any).botLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' }
    });
    console.log("BotLogs:", JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
