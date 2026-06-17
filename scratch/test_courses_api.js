const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

async function main() {
    const libsqlUrl = "file:///D:/Documentos/antigravity/spa/Spa/dev.db";
    const adapter = new PrismaLibSql({ url: libsqlUrl });
    const prisma = new PrismaClient({ adapter });

    try {
        const negocioId = "cmmlfry6q0004l0w54cdbpyx9"; // The only business
        const courses = await prisma.course.findMany({
            where: { businessId: negocioId },
            include: {
                schedules: {
                    include: {
                        service: {
                            select: { nombre: true }
                        }
                    }
                },
                _count: {
                    select: { enrollments: true }
                },
                enrollments: {
                    where: { status: 'pending' },
                    select: { id: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log(JSON.stringify(courses, null, 2));
    } catch (e) {
        console.error("ERROR", e);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
