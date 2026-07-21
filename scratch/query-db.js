const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

const dbUrl = 'file:./dev.db';
const absPath = path.resolve(__dirname, '../dev.db');
const normalized = absPath.split(/[/\\]/).join('/');
const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
const resolvedUrl = `file://${prefix}${normalized}`;

const adapter = new PrismaLibSql({ url: resolvedUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        const campaigns = await prisma.campaign.findMany({
            include: { Quests: true }
        });
        console.log("CAMPAIGNS:");
        console.log(JSON.stringify(campaigns, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
