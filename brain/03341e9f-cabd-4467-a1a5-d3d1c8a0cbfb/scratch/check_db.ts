import prisma from './src/lib/prisma';
async function run() {
    try {
        const tables: any[] = await (prisma as any).$queryRawUnsafe('SELECT name FROM sqlite_master WHERE type="table"');
        console.log('Tables:', tables.map(t => t.name).join(', '));
        
        const userRoleCols: any[] = await (prisma as any).$queryRawUnsafe('PRAGMA table_info(UserRole)');
        console.log('UserRole columns:', userRoleCols.map(c => c.name).join(', '));
    } catch(e: any) {
        console.error(e.message);
    }
}
run().finally(() => process.exit(0));
