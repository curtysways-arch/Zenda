import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:../prisma/dev.db',
    },
  },
});

async function main() {
    console.log("🧹 Limpiando todas las citas...");
    try {
        const p = await prisma.pagoReserva.deleteMany({});
        console.log(`- Pagos eliminados: ${p.count}`);
        
        const a = await prisma.appointment.deleteMany({});
        console.log(`- Citas eliminadas: ${a.count}`);
        
        console.log("✅ Limpieza completada.");
    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
