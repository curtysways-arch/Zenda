import prisma from './src/lib/prisma';

async function migrateImages() {
    try {
        console.log("Renaming canchaId to serviceId in Imagen...");
        await prisma.$executeRawUnsafe(`ALTER TABLE Imagen RENAME COLUMN canchaId TO serviceId`);
    } catch(e) { console.error("Rename Imagen error:", e.message) }
    
    try {
        console.log("Renaming canchaId to serviceId in CourseSchedule...");
        await prisma.$executeRawUnsafe(`ALTER TABLE CourseSchedule RENAME COLUMN canchaId TO serviceId`);
    } catch(e) { console.error("Rename CourseSchedule error:", e.message) }

    try {
        console.log("Checking _PromotionToService...");
        // If it was _CanchaToPromotion, rename table and columns. Let's just rename columns first.
        await prisma.$executeRawUnsafe(`ALTER TABLE "_PromotionToService" RENAME COLUMN "B" TO "serviceId_temp"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "_CanchaToPromotion" RENAME TO "_PromotionToService"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "_PromotionToService" RENAME COLUMN "A" TO "serviceId_temp2"`);
    } catch(e) { console.error("PromotionToService error:", e.message) }

    console.log("Done");
}

migrateImages().finally(() => process.exit(0));
