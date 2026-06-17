import prisma from './src/lib/prisma';

async function verify() {
    try {
        console.log("Creating Staff table...");
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "Staff" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "businessId" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "role" TEXT NOT NULL,
                "avatar" TEXT,
                "workingHours" TEXT,
                "active" BOOLEAN NOT NULL DEFAULT true,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL,
                CONSTRAINT "Staff_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Negocio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            )
        `);
        console.log("Staff table created.");

        console.log("Creating _StaffServices table...");
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "_StaffServices" (
                "A" TEXT NOT NULL,
                "B" TEXT NOT NULL,
                CONSTRAINT "_StaffServices_A_fkey" FOREIGN KEY ("A") REFERENCES "Cancha" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "_StaffServices_B_fkey" FOREIGN KEY ("B") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);
        console.log("_StaffServices table created.");

        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "_StaffServices_AB_unique" ON "_StaffServices"("A", "B")
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "_StaffServices_B_index" ON "_StaffServices"("B")
        `);

    } catch(e) { 
        console.log("Error:");
        console.log(e.message);
    }
}

verify().finally(() => process.exit(0));
