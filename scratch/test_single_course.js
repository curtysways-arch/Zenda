const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

async function main() {
    const libsqlUrl = "file:///D:/Documentos/antigravity/spa/Spa/dev.db";
    const adapter = new PrismaLibSql({ url: libsqlUrl });
    const prisma = new PrismaClient({ adapter });

    try {
        const id = "course-1";
        const negocioId = "cmmlfry6q0004l0w54cdbpyx9"; // The only business
        const course = await prisma.course.findFirst({
            where: { id, businessId: negocioId },
            include: {
                CourseSchedule: true,
                _count: {
                    select: {
                        CourseEnrollment: { where: { status: 'approved' } }
                    }
                }
            }
        });

        if (!course) {
             console.log("NOT FOUND");
             return;
        }
        
        const formattedCourse = {
            ...course,
            schedules: course.CourseSchedule,
            _count: {
                enrollments: course._count?.CourseEnrollment ?? 0
            }
        };
        console.log(JSON.stringify(formattedCourse, null, 2));
    } catch (e) {
        console.error("ERROR", e);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
