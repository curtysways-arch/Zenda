import prisma from '../src/lib/prisma';

async function run() {
    const slug = 'demo-spa';
    const negocio = await prisma.negocio.findUnique({
        where: { slug },
        include: {
            Service: true
        }
    });

    if (!negocio) {
        console.log(`Negocio con slug "${slug}" no encontrado.`);
        return;
    }

    console.log(`Negocio encontrado: ${negocio.nombre} (ID: ${negocio.id})`);
    console.log(`Servicios encontrados (${negocio.Service.length}):`);
    negocio.Service.forEach((s: any) => {
        console.log(`- ID: ${s.id}, Nombre: ${s.nombre}, Tipo: ${s.tipo}, Activo (estaActivo): ${s.estaActivo}`);
    });
}

run().catch(console.error);
