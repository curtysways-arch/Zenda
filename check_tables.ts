import prisma from './src/lib/prisma';

async function verify() {
    try {
        const tablesRaw: any[] = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table'`);
        const tables = tablesRaw.map(t => t.name);

        console.log("All tables in DB:", tables.join(', '));
    } catch(e) { 
        console.log("Error:", e.message);
    }
}

verify().finally(() => process.exit(0));
