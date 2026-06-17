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
    
    const payments = await prisma.pagoReserva.findMany({
        where: {
            Appointment: {
                negocioId: businessId
            }
        },
        include: { Appointment: { include: { cliente: true } } }
    });

    console.log(`Found ${payments.length} total payments for business ${businessId}:`);
    payments.forEach(p => {
        console.log(`ID: ${p.id}, Amount: ${p.monto}, Date: ${p.fecha.toISOString()}, Client: ${p.Appointment?.cliente?.nombre}`);
    });

    await prisma.$disconnect();
}

main().catch(e => console.error(e));
