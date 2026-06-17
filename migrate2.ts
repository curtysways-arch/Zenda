import prisma from './src/lib/prisma';

async function migrate() {
    try {
        console.log("Adding estaActivo...");
        await prisma.$executeRawUnsafe(`ALTER TABLE Cancha ADD COLUMN estaActivo BOOLEAN NOT NULL DEFAULT true`);
    } catch(e) { console.error("estaActivo ext", e.message) }

    console.log("Done checking columns");
}

migrate().finally(() => process.exit(0));
