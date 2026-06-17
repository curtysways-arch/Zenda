import prisma from './src/lib/prisma';

async function checkAndApply() {
    try {
        const tablesRaw: any[] = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table'`);
        const tables = tablesRaw.map(t => t.name);

        for (const t of tables) {
            const colsRaw: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("${t}")`);
            const cols = colsRaw.map(c => c.name);

            // If we have courtId but no serviceId
            if (cols.includes('courtId') && !cols.includes('serviceId')) {
                console.log(`Renaming courtId to serviceId in ${t}...`);
                try {
                    await prisma.$executeRawUnsafe(`ALTER TABLE "${t}" RENAME COLUMN courtId TO serviceId`);
                } catch(e) { console.error(`Error on ${t}:`, e.message) }
            }
        }
        console.log("All tables checked for courtId.");
    } catch(e) { 
        console.log("Error:", e.message);
    }
}

checkAndApply().finally(() => process.exit(0));
