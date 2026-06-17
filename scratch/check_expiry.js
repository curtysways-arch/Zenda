if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = "file:./dev.db";
}
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

let libsqlUrl = process.env['DATABASE_URL'];
if (libsqlUrl.startsWith('file:')) {
    const path = require('path');
    let rawPath = libsqlUrl.replace(/^file:\/?\/?\/?/, '');
    let finalPath = path.resolve(process.cwd(), rawPath).replace(/\\/g, '/');
    if (finalPath.match(/^[a-zA-Z]:/)) finalPath = '/' + finalPath;
    libsqlUrl = `file://${finalPath}`;
}
process.env['DATABASE_URL'] = 'file:./dev.db';

const adapter = new PrismaLibSql({ url: libsqlUrl });
const prisma = new PrismaClient({ adapter });

async function run() {
    try {
        const apps = await prisma.appointment.findMany();
        console.log("All appointments in DB:");
        for (const a of apps) {
            console.log(`- ID: ${a.id}, State: [${a.estado}], Date: [${a.fecha}], Expiry: [${a.expiresAt}]`);
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
