const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Intentar listar las tablas directamente
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table';`;
    console.log('Tables in DB:', JSON.stringify(tables, null, 2));

    // Verificar si existe la tabla Rating y sus columnas
    const columns = await prisma.$queryRaw`PRAGMA table_info(Rating);`;
    console.log('Columns in Rating:', JSON.stringify(columns, null, 2));
    
    // Verificar si hay citas y profesionales
    const appCount = await prisma.appointment.count();
    console.log('Total Appointments:', appCount);
    
    if (appCount > 0) {
        const sample = await prisma.appointment.findFirst({
            include: { cliente: true, staff: true }
        });
        console.log('Sample Appointment:', JSON.stringify({
            id: sample.id,
            estado: sample.estado,
            clienteId: sample.clienteId,
            staffId: sample.staffId
        }, null, 2));
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
