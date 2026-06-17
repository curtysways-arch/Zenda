import prisma from './src/lib/prisma';

async function checkAndApply() {
    try {
        const tablesRaw: any[] = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table'`);
        const tables = tablesRaw.map(t => t.name);

        for (const t of tables) {
            const colsRaw: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("${t}")`);
            const cols = colsRaw.map(c => c.name);

            if (cols.includes('fieldId') && !cols.includes('serviceId')) {
                console.log(`Renaming fieldId to serviceId in ${t}...`);
                await prisma.$executeRawUnsafe(`ALTER TABLE "${t}" RENAME COLUMN fieldId TO serviceId`);
            }
            if (cols.includes('pitchId') && !cols.includes('serviceId')) {
                console.log(`Renaming pitchId to serviceId in ${t}...`);
                await prisma.$executeRawUnsafe(`ALTER TABLE "${t}" RENAME COLUMN pitchId TO serviceId`);
            }
        }
        console.log("All tables checked for fieldId and pitchId.");
    } catch(e) { 
        console.log("Error:", e.message);
    }
}

checkAndApply().finally(() => process.exit(0));
