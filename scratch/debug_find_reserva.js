const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const id = '44e82912-fc4e-47f3-870d-b9c0c6dafc1b';
    console.log('Searching for ID:', id);
    
    const appointment = await prisma.appointment.findUnique({
        where: { id }
    });
    
    console.log('Result with findUnique:', appointment);
    
    const raw = await prisma.$queryRawUnsafe(`SELECT * FROM Reserva WHERE id = '${id}'`);
    console.log('Result with queryRawUnsafe:', raw);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
