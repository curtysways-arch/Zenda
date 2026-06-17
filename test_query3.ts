import prisma from './src/lib/prisma';

async function main() {
    try {
        const dbReservas = await prisma.appointment.findMany({
            take: 5,
            include: {
                Service: true,
                Staff: true
            }
        });
        console.log("Success! Found:", dbReservas.length);
    } catch (e) {
        console.error("Query Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
