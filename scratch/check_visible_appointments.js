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

    const businessId = 'cmmlfry6q0004l0w54cdbpyx9';
    const now = new Date();
    
    const pendingConfirmed = await prisma.appointment.findMany({
        where: {
            negocioId: businessId,
            estado: { in: ['pending', 'confirmed'] },
            fecha: { gte: new Date(now.setHours(0,0,0,0)) }
        },
        include: { cliente: true, service: true }
    });

    console.log(`Found ${pendingConfirmed.length} pending/confirmed appointments for today onwards:`);
    pendingConfirmed.forEach(a => {
        console.log(`ID: ${a.id}, Status: ${a.estado}, Client: ${a.cliente?.nombre}, Date: ${a.fecha.toISOString()}, Time: ${a.horaInicio}`);
    });

    await prisma.$disconnect();
}

main().catch(e => console.error(e));
