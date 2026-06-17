import prisma from './src/lib/prisma';

async function verify() {
    try {
        await prisma.$queryRawUnsafe(`SELECT 1 FROM Staff LIMIT 1`);
        console.log("Staff table exists.");
    } catch(e) { 
        console.log("Staff table DOES NOT EXIST. Error:");
        console.log(e.message);
    }
}

verify().finally(() => process.exit(0));
