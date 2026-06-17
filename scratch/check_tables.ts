import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
    const tables = await p.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table'");
    console.log(JSON.stringify(tables, null, 2));
}
main().finally(() => p.$disconnect());
