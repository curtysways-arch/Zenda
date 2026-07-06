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
    const negocios = await prisma.negocio.findMany({
        select: {
            id: true,
            nombre: true,
            slug: true,
            colorPrimario: true,
            colorSecundario: true,
            colorTerciario: true,
            colorNeutral: true,
            colorTexto: true,
            colorSubTexto: true
        }
    });
    console.log("Negocios Colors:");
    negocios.forEach(n => {
        console.log(n);
    });
}

main().catch(err => {
    console.error(err);
}).finally(() => {
    prisma.$disconnect();
});
