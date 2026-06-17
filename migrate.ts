import prisma from './src/lib/prisma';

async function migrate() {
    try {
        console.log("Adding duracion...");
        await prisma.$executeRawUnsafe(`ALTER TABLE Cancha ADD COLUMN duracion INTEGER NOT NULL DEFAULT 60`);
    } catch(e) { console.error("duracion ext", e.message) }

    try {
        console.log("Adding precio...");
        await prisma.$executeRawUnsafe(`ALTER TABLE Cancha ADD COLUMN precio REAL`);
    } catch(e) { console.error("precio ext", e.message) }

    try {
        console.log("Adding categoryId...");
        await prisma.$executeRawUnsafe(`ALTER TABLE Cancha ADD COLUMN categoryId TEXT`);
    } catch(e) { console.error("categoryId ext", e.message) }

    try {
        console.log("Adding extraInfo...");
        await prisma.$executeRawUnsafe(`ALTER TABLE Cancha ADD COLUMN extraInfo TEXT`);
    } catch(e) { console.error("extraInfo ext", e.message) }
    
    // Y categories (TipoCancha) -> categoryId, we can leave that as is if the schema just added the field or it was renamed from tipoId?
    console.log("Done checking columns");
}

migrate().finally(() => process.exit(0));
