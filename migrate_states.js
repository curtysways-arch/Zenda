const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Actualizar todos los estados a minúsculas
        const confirmadas = await prisma.reserva.updateMany({
            where: { estado: 'CONFIRMADA' },
            data: { estado: 'confirmed' }
        });
        console.log(`Updated ${confirmadas.count} CONFIRMADA to confirmed`);

        const pendientes = await prisma.reserva.updateMany({
            where: { estado: 'PENDIENTE' },
            data: { estado: 'pending' }
        });
        console.log(`Updated ${pendientes.count} PENDIENTE to pending`);

        const canceladas = await prisma.reserva.updateMany({
            where: { estado: 'CANCELADA' },
            data: { estado: 'cancelled' }
        });
        console.log(`Updated ${canceladas.count} CANCELADA to cancelled`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
