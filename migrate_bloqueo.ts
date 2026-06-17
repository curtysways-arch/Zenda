import prisma from './src/lib/prisma';

async function migrate() {
    try {
        console.log("Renaming canchaId to serviceId in Bloqueo...");
        await prisma.$executeRawUnsafe(`ALTER TABLE Bloqueo RENAME COLUMN canchaId TO serviceId`);
    } catch(e) { console.error("Rename Bloqueo error:", e.message) }

    console.log("Done checking Bloqueo columns");
}

migrate().finally(() => process.exit(0));
