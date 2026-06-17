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

    const totalRetries = await prisma.retryMessage.count();
    console.log("Total RetryMessages in DB:", totalRetries);

    const retries = await prisma.retryMessage.findMany();
    retries.forEach(r => {
        console.log(`ID: ${r.id}, Phone: ${r.phone}, Attempts: ${r.attempts}, Next: ${r.next_retry_at.toISOString()}`);
    });

    await prisma.$disconnect();
}

main().catch(e => console.error(e));
