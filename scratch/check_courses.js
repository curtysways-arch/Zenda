const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

async function main() {
    const libsqlUrl = "file:///D:/Documentos/antigravity/spa/Spa/dev.db";
    const adapter = new PrismaLibSql({ url: libsqlUrl });
    const prisma = new PrismaClient({ adapter });

    try {
        const courses = await prisma.course.findMany({
            include: { Negocio: { select: { nombre: true, id: true } } }
        });
        console.log(JSON.stringify(courses, null, 2));
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
