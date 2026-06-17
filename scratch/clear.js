const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🧹 Limpiando base de datos...");
    try {
        const count = await prisma.appointment.deleteMany({});
        console.log(`✅ Citas eliminadas: ${count.count}`);
        
        const count2 = await prisma.pagoReserva.deleteMany({});
        console.log(`✅ Pagos eliminados: ${count2.count}`);
    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
