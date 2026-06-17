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
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
        where: {
            fecha: {
                gte: today,
                lt: tomorrow
            }
        },
        include: { cliente: true, service: true, negocio: true }
    });

    console.log(`Found ${appointments.length} appointments for today:`);
    appointments.forEach(a => {
        console.log(`ID: ${a.id}, Business: ${a.negocio?.nombre} (${a.negocioId}), Status: ${a.estado}, Client: ${a.cliente?.nombre}, Time: ${a.horaInicio}`);
    });

    await prisma.$disconnect();
}

main().catch(e => console.error(e));
