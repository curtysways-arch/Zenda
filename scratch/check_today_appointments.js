const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const path = require('path');

async function main() {
    let libsqlUrl = process.env.DATABASE_URL || "file:./dev.db";
    if (libsqlUrl.startsWith('file:')) {
        let rawPath = libsqlUrl.replace(/^file:\/?\/?\/?/, '');
        let finalPath = path.resolve(process.cwd(), rawPath);
        finalPath = finalPath.replace(/\\/g, '/');
        if (finalPath.match(/^[a-zA-Z]:/)) {
            finalPath = '/' + finalPath;
        }
        libsqlUrl = `file://${finalPath}`;
    }

    const adapter = new PrismaLibSql({ url: libsqlUrl });
    const prisma = new PrismaClient({ adapter });

    const today = new Date();
    today.setHours(0,0,0,0);

    const appointmentsToday = await prisma.appointment.findMany({
        where: {
            createdAt: { gte: today }
        },
        include: { cliente: true }
    });

    console.log(`Appointments created today (${today.toISOString()}):`, appointmentsToday.length);
    appointmentsToday.forEach(a => {
        console.log(`ID: ${a.id}, Status: ${a.estado}, Client: ${a.cliente?.nombre}, Phone: ${a.cliente?.telefono}, Created: ${a.createdAt.toISOString()}, ExpiresAt: ${a.expiresAt?.toISOString() || 'N/A'}`);
    });

    await prisma.$disconnect();
}

main().catch(e => console.error(e));
