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

    const allAppointments = await prisma.appointment.findMany({
        include: { cliente: true, negocio: true }
    });

    console.log(`Total appointments in DB: ${allAppointments.length}`);
    allAppointments.forEach(a => {
        console.log(`ID: ${a.id}, Status: ${a.estado}, Client: ${a.cliente?.nombre}, Date: ${a.fecha.toISOString()}, Business: ${a.negocio?.nombre}`);
    });

    await prisma.$disconnect();
}

main().catch(e => console.error(e));
