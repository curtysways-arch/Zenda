const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const path = require('path');

async function main() {
    let libsqlUrl = process.env.DATABASE_URL || "file:./dev.db";
    
    // Convertir path local si es necesario (similar a prisma.ts)
    if (libsqlUrl.startsWith('file:')) {
        let rawPath = libsqlUrl.replace(/^file:\/?\/?\/?/, '');
        let finalPath = path.resolve(process.cwd(), rawPath);
        finalPath = finalPath.replace(/\\/g, '/');
        if (finalPath.match(/^[a-zA-Z]:/)) {
            finalPath = '/' + finalPath;
        }
        libsqlUrl = `file://${finalPath}`;
    }

    console.log("Connecting to:", libsqlUrl);
    const adapter = new PrismaLibSql({ url: libsqlUrl });
    const prisma = new PrismaClient({ adapter });

    const now = new Date();
    console.log("Current time:", now.toISOString());

    const expiredAppointments = await prisma.appointment.findMany({
        where: { estado: 'expired' },
        include: { cliente: true },
        take: 10,
        orderBy: { updatedAt: 'desc' }
    });

    console.log("\nLast 10 expired appointments:");
    expiredAppointments.forEach(a => {
        console.log(`ID: ${a.id}, Client: ${a.cliente?.nombre}, Phone: ${a.cliente?.telefono}, Created: ${a.createdAt.toISOString()}, ExpiredAt: ${a.expiresAt?.toISOString()}`);
    });

    const pendingAppointments = await prisma.appointment.findMany({
        where: { estado: 'pending' },
        include: { cliente: true }
    });

    console.log("\nPending appointments that should be expired:");
    const shouldBeExpired = pendingAppointments.filter(a => {
        if (a.expiresAt && a.expiresAt < now) return true;
        // Fallback de 15 min si no tiene expiresAt
        if (!a.expiresAt && (now - a.createdAt) > 15 * 60 * 1000) return true;
        return false;
    });

    shouldBeExpired.forEach(a => {
        console.log(`ID: ${a.id}, Client: ${a.cliente?.nombre}, Phone: ${a.cliente?.telefono}, Created: ${a.createdAt.toISOString()}, ExpiresAt: ${a.expiresAt?.toISOString() || 'N/A'}`);
    });

    const retryMessages = await prisma.retryMessage.findMany({
        take: 10,
        orderBy: { next_retry_at: 'desc' }
    });

    console.log("\nRecent RetryMessages:");
    retryMessages.forEach(m => {
        console.log(`Phone: ${m.phone}, Attempts: ${m.attempts}, Next: ${m.next_retry_at.toISOString()}, Message: ${m.message.substring(0, 50)}...`);
    });

    await prisma.$disconnect();
}

main().catch(e => console.error(e));
