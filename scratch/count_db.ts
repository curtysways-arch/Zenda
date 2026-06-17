import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("📊 Conteos de Base de Datos:");
    try {
        const appCount = await prisma.appointment.count();
        console.log(`- Citas (Appointment): ${appCount}`);
        
        try {
            const resCount = await (prisma as any).reserva.count();
            console.log(`- Reservas (Reserva): ${resCount}`);
        } catch(e) {
            console.log("- Tabla 'Reserva' no accesible vía Prisma.");
        }
    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
