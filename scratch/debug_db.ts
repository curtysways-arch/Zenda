import prisma from '../src/lib/prisma';

async function main() {
    console.log("DEBUG: Testing Course query");
    try {
        const curso = await prisma.course.findUnique({
            where: { id: 'course-1' },
            include: {
                CourseSchedule: {
                    include: { Service: { select: { nombre: true, Ubicacion: { select: { nombre: true } } } } }
                },
                _count: {
                    select: { CourseEnrollment: { where: { status: 'approved' } } }
                }
            }
        });
        console.log("Found:", JSON.stringify(curso, null, 2));
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
