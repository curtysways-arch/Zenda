import prisma from './src/lib/prisma';

async function migratePromotionM2M() {
    try {
        console.log("Recreating _PromotionToService...");
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "_PromotionToService" (
                "A" TEXT NOT NULL,
                "B" TEXT NOT NULL,
                CONSTRAINT "_PromotionToService_A_fkey" FOREIGN KEY ("A") REFERENCES "Promotion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "_PromotionToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Cancha" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);

        console.log("Copying existing data and swapping A(Cancha) and B(Promotion) -> A(Promotion) and B(Service)...");
        await prisma.$executeRawUnsafe(`
            INSERT INTO "_PromotionToService" ("A", "B")
            SELECT "B" AS "A", "A" AS "B" FROM "_PromotionToCancha"
        `);
        console.log("Data copied.");

        console.log("Creating indices...");
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "_PromotionToService_AB_unique" ON "_PromotionToService"("A", "B")
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "_PromotionToService_B_index" ON "_PromotionToService"("B")
        `);

        console.log("Dropping old _PromotionToCancha table...");
        await prisma.$executeRawUnsafe(`DROP TABLE "_PromotionToCancha"`);

        console.log("Done!");
    } catch(e) { 
        console.log("Error:", e.message);
    }
}

migratePromotionM2M().finally(() => process.exit(0));
