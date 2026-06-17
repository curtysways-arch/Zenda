import prisma from '../src/lib/prisma';

async function checkSchema() {
    try {
        console.log("Checking database columns for 'Reserva' (Appointment) table...");
        const columns: any = await prisma.$queryRaw`PRAGMA table_info(Reserva)`;
        console.log("Columns in table 'Reserva':");
        columns.forEach((col: any) => {
            console.log(` - ${col.name} (${col.type})`);
        });
    } catch (error: any) {
        console.error("Error inspecting database:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
