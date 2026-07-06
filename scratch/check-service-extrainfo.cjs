const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
const absPath = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath) ? rawPath : `${process.cwd()}/${rawPath}`;
const normalized = absPath.split(/[/\\]/).join('/');
const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
const resolvedUrl = `file://${prefix}${normalized}`;

const adapter = new PrismaLibSql({ url: resolvedUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
    const services = await prisma.service.findMany({
        take: 5
    });
    console.log("Services loaded:");
    services.forEach(s => {
        console.log(`- ID: ${s.id}, Name: ${s.nombre}, extraInfo:`, JSON.stringify(s.extraInfo));
    });
}

main().catch(err => {
    console.error(err);
}).finally(() => {
    prisma.$disconnect();
});
