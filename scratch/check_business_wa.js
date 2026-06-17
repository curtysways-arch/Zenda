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

    const negocios = await prisma.negocio.findMany({
        select: { id: true, nombre: true, whatsapp: true, slug: true }
    });

    console.log("Negocios configurados:");
    negocios.forEach(n => {
        console.log(`ID: ${n.id}, Nombre: ${n.nombre}, WhatsApp: ${n.whatsapp}, Slug: ${n.slug}`);
    });

    await prisma.$disconnect();
}

main().catch(e => console.error(e));
