import prisma from './src/lib/prisma';

async function test() {
    try {
        console.log("Running appointment.findMany with includes...");
        const citasSemana = await prisma.appointment.findMany({
            where: {
                negocioId: "test"
            },
            include: {
                cliente: { select: { nombre: true } },
                service: { select: { nombre: true } }
            }
        });
        console.log("Success! Count:", citasSemana.length);
    } catch (e) {
        console.error("Prisma Error:", e);
    }
}
test();
