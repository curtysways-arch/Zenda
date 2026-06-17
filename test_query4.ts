import prisma from './src/lib/prisma';

async function main() {
    try {
        const reservas: any[] = await prisma.$queryRawUnsafe(`
            SELECT 
                r.id, r.fecha, r.horaInicio, r.horaFin, r.estado, 
                r.total, r.serviceId, r.staffId
            FROM Reserva r
            LIMIT 5
        `);
        console.log("Reservas:", reservas);

        if (reservas.length > 0 && reservas[0].serviceId) {
            const serviceRows = await prisma.$queryRawUnsafe(
                `SELECT id, nombre FROM Cancha WHERE id = '${reservas[0].serviceId}'`
            );
            console.log("Service Rows:", serviceRows);
        }
    } catch (e) {
        console.error("Query Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
