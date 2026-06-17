const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const now = new Date();
    console.log("Current time:", now.toISOString());

    const expiredAppointments = await prisma.appointment.findMany({
        where: { estado: 'expired' },
        include: { cliente: true },
        take: 5,
        orderBy: { updatedAt: 'desc' }
    });

    console.log("Last 5 expired appointments:");
    expiredAppointments.forEach(a => {
        console.log(`ID: ${a.id}, Client: ${a.cliente.nombre}, Phone: ${a.cliente.telefono}, Created: ${a.createdAt.toISOString()}, ExpiredAt: ${a.expiresAt?.toISOString()}`);
    });

    const pendingAppointments = await prisma.appointment.findMany({
        where: { estado: 'pending' },
        include: { cliente: true }
    });

    console.log("\nPending appointments that should be expired:");
    const shouldBeExpired = pendingAppointments.filter(a => {
        if (a.expiresAt && a.expiresAt < now) return true;
        if (!a.expiresAt && (now - a.createdAt) > 15 * 60 * 1000) return true;
        return false;
    });

    shouldBeExpired.forEach(a => {
        console.log(`ID: ${a.id}, Client: ${a.cliente.nombre}, Phone: ${a.cliente.telefono}, Created: ${a.createdAt.toISOString()}, ExpiresAt: ${a.expiresAt?.toISOString() || 'N/A'}`);
    });

    const retryMessages = await prisma.retryMessage.findMany({
        take: 10,
        orderBy: { next_retry_at: 'desc' }
    });

    console.log("\nRecent RetryMessages:");
    retryMessages.forEach(m => {
        console.log(`Phone: ${m.phone}, Attempts: ${m.attempts}, Next: ${m.next_retry_at.toISOString()}, Message: ${m.message.substring(0, 50)}...`);
    });

    const botLogs = await prisma.botLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' }
    });

    console.log("\nRecent BotLogs:");
    botLogs.forEach(l => {
        console.log(`Phone: ${l.phone}, Action: ${l.action_taken}, Received: ${l.message_received?.substring(0, 30)}, Sent: ${l.message_sent?.substring(0, 30)}`);
    });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
