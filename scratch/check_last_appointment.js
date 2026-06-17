const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const last = await prisma.appointment.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { id: true, fecha: true, horaInicio: true, createdAt: true }
    });
    console.log(JSON.stringify(last, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
