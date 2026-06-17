import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const info = await prisma.$queryRawUnsafe("PRAGMA table_info(Reserva)");
        console.log("Reserva columns:", JSON.stringify(info, null, 2));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
