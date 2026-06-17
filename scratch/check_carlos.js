const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- CITAS DE CARLOS EL 29 DE ABRIL ---');
    const apps = await prisma.appointment.findMany({
        where: {
            fecha: {
                gte: new Date('2026-04-29T00:00:00.000Z'),
                lte: new Date('2026-04-29T23:59:59.999Z')
            },
            cliente: {
                nombre: {
                    contains: 'Carlos'
                }
            }
        },
        include: {
            cliente: true,
            service: true
        }
    });

    apps.forEach(app => {
        console.log(`ID: ${app.id}`);
        console.log(`Cliente: ${app.cliente.nombre}`);
        console.log(`Servicio: ${app.service?.nombre}`);
        console.log(`Hora: ${app.horaInicio} - ${app.horaFin}`);
        console.log(`Estado: ${app.estado}`);
        console.log(`Pago: ${app.pagoEstado}`);
        console.log('-----------------------------------');
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
