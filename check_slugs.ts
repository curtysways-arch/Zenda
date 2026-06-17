import prisma from './src/lib/prisma';

async function run() {
    const negocio = await prisma.negocio.findFirst({ where: { slug: 'nails-spa' } });
    console.log("Nails Spa:", { logoUrl: negocio?.logoUrl, nombre: negocio?.nombre, configuracion: negocio?.configuracion });
}

run().catch(console.error);
