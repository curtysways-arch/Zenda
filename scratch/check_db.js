const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- ÚLTIMAS RESERVAS ---');
        const appointments = await prisma.appointment.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { cliente: true, negocio: true }
        });
        
        appointments.forEach(a => {
            console.log(`ID: ${a.id} | Estado: ${a.estado} | Cliente: ${a.cliente?.nombre} (${a.cliente?.telefono}) | Negocio: ${a.negocio?.nombre} | Creada: ${a.createdAt}`);
        });

        console.log('\n--- ÚLTIMOS CLIENTES ---');
        const clientes = await prisma.cliente.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 5
        });
        clientes.forEach(c => {
            console.log(`ID: ${c.id} | Nombre: ${c.nombre} | Tel: ${c.telefono} | NegocioId: ${c.negocioId}`);
        });

        console.log('\n--- ÚLTIMOS BOT LOGS ---');
        const logs = await prisma.botLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: 5
        });
        logs.forEach(l => {
            console.log(`[${l.timestamp}] ${l.phone}: ${l.message_received} -> ${l.action_taken}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
