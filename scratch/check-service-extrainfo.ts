import prisma from '../src/lib/prisma';

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
});
