import prisma from './src/lib/prisma';

async function main() {
    try {
        let reservas = await prisma.$queryRawUnsafe<any[]>(`
            SELECT 
                r.id, r.fecha, r.horaInicio, r.horaFin, r.estado, 
                r.total, r.pagoEstado, r.metodoPago, r.comentarios,
                r.serviceId, r.staffId, r.negocioId, r.clienteId
            FROM Reserva r
            WHERE r.horaInicio IN ('09:00', '13:00')
            LIMIT 5
        `);

        const enriched = await Promise.all(
            reservas.map(async (r: any) => {
                let service: any = null;

                try {
                    if (r.serviceId) {
                        const serviceRows: any[] = await prisma.$queryRawUnsafe(
                            `SELECT id, nombre, descripcion, precio FROM Cancha WHERE id = '${r.serviceId}' LIMIT 1`
                        );
                        if (serviceRows.length > 0) {
                            service = serviceRows[0];
                        }
                    }
                } catch (e) {
                    console.error("Error", e);
                }

                return {
                    id: r.id,
                    horaInicio: r.horaInicio,
                    serviceId: r.serviceId,
                    service: service
                };
            })
        );
        console.log(JSON.stringify(enriched, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
