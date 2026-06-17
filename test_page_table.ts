import prisma from './src/lib/prisma';

async function main() {
    try {
        // Check if Page table exists
        const tables = await prisma.$queryRawUnsafe<any[]>(`SELECT name FROM sqlite_master WHERE type='table' AND name='Page'`);
        console.log("Page table exists:", tables.length > 0);
        if (tables.length > 0) {
            const info = await prisma.$queryRawUnsafe<any[]>(`PRAGMA table_info(Page)`);
            console.log("Page columns:", info.map(r => r.name));
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
