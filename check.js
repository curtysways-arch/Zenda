const prisma = require('./src/lib/prisma').default;

async function main() {
    const apps = await prisma.appointment.findMany({
        select: {
            id: true,
            fecha: true,
            horaInicio: true,
            horaFin: true,
            estado: true,
            staffId: true,
            cliente: { select: { nombre: true } }
        }
    });
    console.log("ALL APPOINTMENTS:", apps);
}

main().catch(console.error).finally(() => prisma.$disconnect?.());
