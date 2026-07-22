const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const negocios = await prisma.negocio.findMany({
        where: {
            OR: [
                { slug: { contains: 'pincho' } },
                { nombre: { contains: 'pincho', mode: 'insensitive' } }
            ]
        }
    });

    console.log(`Encontrados ${negocios.length} negocios de pinchos:`);
    for (const n of negocios) {
        console.log(`- ID: ${n.id}, Nombre: ${n.nombre}, Slug: ${n.slug}`);
        const config = n.configuracion || {};
        config.montoMinimoPedido = 5.00;
        await prisma.negocio.update({
            where: { id: n.id },
            data: { configuracion: config }
        });
        console.log(`  -> Actualizado montoMinimoPedido a $5.00 en ${n.nombre}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
