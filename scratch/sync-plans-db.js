const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔄 Sincronizando maxAppointmentsMonthly con max_reservations_per_month en todos los planes...');
        
        const planes = await prisma.plan.findMany();
        console.log(`Encontrados ${planes.length} planes en la base de datos.`);

        let actualizados = 0;
        for (const plan of planes) {
            const expectedValue = plan.max_reservations_per_month;
            if (plan.maxAppointmentsMonthly !== expectedValue) {
                console.log(`Plan "${plan.name}" (ID: ${plan.id}): actualizando maxAppointmentsMonthly de ${plan.maxAppointmentsMonthly} a ${expectedValue}`);
                await prisma.plan.update({
                    where: { id: plan.id },
                    data: { maxAppointmentsMonthly: expectedValue }
                });
                actualizados++;
            } else {
                console.log(`Plan "${plan.name}" (ID: ${plan.id}): ya está sincronizado (${expectedValue} citas)`);
            }
        }

        console.log(`✅ Sincronización completada. Planes actualizados: ${actualizados}`);

    } catch (e) {
        console.error('❌ Error ejecutando la sincronización de planes:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
