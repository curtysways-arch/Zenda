import prisma from './src/lib/prisma';

async function verify() {
    try {
        const canchaCols: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info(Cancha)`);
        console.log("Cancha columns:", canchaCols.map(c => c.name).join(', '));
        
        const negCols: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info(Negocio)`);
        console.log("Negocio columns:", negCols.map(c => c.name).join(', '));

        const appCols: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info(Appointment)`);
        console.log("Appointment columns:", appCols.map(c => c.name).join(', '));

    } catch(e) { 
        console.log("Error:");
        console.log(e.message);
    }
}

verify().finally(() => process.exit(0));
