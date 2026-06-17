
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("DEBUG: All Appointments in DB");
    const appointments = await prisma.appointment.findMany({
        include: { negocio: true, cliente: true }
    });
    console.log(JSON.stringify(appointments.map(a => ({
        id: a.id,
        negocio: a.negocio?.slug,
        negocioId: a.negocioId,
        estado: a.estado,
        cliente: a.cliente?.nombre,
        createdAt: a.createdAt
    })), null, 2));

    console.log("\nDEBUG: All Negocios in DB");
    const negocios = await prisma.negocio.findMany();
    console.log(JSON.stringify(negocios.map(n => ({ id: n.id, slug: n.slug })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
