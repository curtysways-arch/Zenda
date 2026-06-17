import prisma from './src/lib/prisma';

async function checkCols() {
    try {
        const colsRaw: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info(CourseSchedule)`);
        console.log("CourseSchedule columns:", colsRaw.map(c => c.name).join(', '));
    } catch(e) { 
        console.log("Error:", e.message);
    }
}

checkCols().finally(() => process.exit(0));
