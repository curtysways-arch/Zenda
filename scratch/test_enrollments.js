const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

async function main() {
    const libsqlUrl = "file:///D:/Documentos/antigravity/spa/Spa/dev.db";
    const adapter = new PrismaLibSql({ url: libsqlUrl });
    const prisma = new PrismaClient({ adapter });

    try {
        const courseId = "course-1";
        const negocioId = "cmmlfry6q0004l0w54cdbpyx9";
        const status = "pending";
        const where = {
            Course: { businessId: negocioId }
        };

        if (status && status !== 'all') {
            where.status = status;
        }
        if (courseId) {
            where.courseId = courseId;
        }

        const enrollments = await prisma.CourseEnrollment.findMany({
            where,
            include: {
                Student: true,
                Course: {
                    select: { id: true, name: true, capacity: true }
                }
            },
            orderBy: { enrollment_date: 'desc' }
        });

        const formatted = enrollments.map((e) => ({
            ...e,
            course: e.Course,
            student: e.Student
        }));
        console.log(JSON.stringify(formatted, null, 2));

    } catch (e) {
        console.error("ERROR", e);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
