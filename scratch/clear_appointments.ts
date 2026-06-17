import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Iniciando limpieza de citas...");
    
    try {
        // 1. Eliminar pagos asociados
        const pagos = await prisma.pagoReserva.deleteMany({});
        console.log(`✅ Pagos eliminados: ${pagos.count}`);

        // 2. Eliminar reservas pendientes (si existen en el modelo)
        try {
            const pending = await (prisma as any).pendingReservation.deleteMany({});
            console.log(`✅ Reservas pendientes eliminadas: ${pending.count}`);
        } catch (e) {
            console.log("ℹ️ No se encontró tabla de PendingReservation o ya estaba vacía.");
        }

        // 3. Eliminar citas
        const appointments = await prisma.appointment.deleteMany({});
        console.log(`✅ Citas eliminadas: ${appointments.count}`);

        console.log("\n✨ Base de datos lista para nuevas pruebas.");
    } catch (error) {
        console.error("❌ Error durante la limpieza:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
