import prisma from './src/lib/prisma';

async function verify() {
    try {
        const tablesRaw: any[] = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table'`);
        tablesRaw.forEach(t => console.log(t.name));
    } catch(e) { 
        console.log("Error:", e.message);
    }
}

verify().finally(() => process.exit(0));
