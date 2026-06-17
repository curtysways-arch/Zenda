import prisma from './src/lib/prisma';

async function migrate() {
    try {
        console.log("Renaming canchaId to serviceId in Reserva...");
        await prisma.$executeRawUnsafe(`ALTER TABLE Reserva RENAME COLUMN canchaId TO serviceId`);
    } catch(e) { console.error("Rename error:", e.message) }

    try {
        console.log("Adding staffId in Reserva...");
        await prisma.$executeRawUnsafe(`ALTER TABLE Reserva ADD COLUMN staffId TEXT`);
    } catch(e) { console.error("staffId add error:", e.message) }

    console.log("Done checking Reserva columns");
}

migrate().finally(() => process.exit(0));
