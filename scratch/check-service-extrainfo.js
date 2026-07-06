const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const services = await prisma.service.findMany({
        take: 5
    });
    console.log("Services loaded:");
    services.forEach(s => {
        console.log(`- ID: ${s.id}, Name: ${s.nombre}, extraInfo:`, JSON.stringify(s.extraInfo));
    });
}

main().catch(err => {
    console.error(err);
}).finally(() => {
    prisma.$disconnect();
});
