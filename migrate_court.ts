import prisma from './src/lib/prisma';

async function migrate() {
    try {
        console.log("Renaming courtId to serviceId in CourseSchedule...");
        await prisma.$executeRawUnsafe(`ALTER TABLE CourseSchedule RENAME COLUMN courtId TO serviceId`);
    } catch(e) { console.error("CourseSchedule rename error:", e.message) }

    console.log("Done");
}

migrate().finally(() => process.exit(0));
