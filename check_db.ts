import prisma from './src/lib/prisma.ts';

async function main() {
    const negocios = await prisma.negocio.findMany({
        select: { id: true, nombre: true, slug: true }
    });
    console.log('--- NEGOCIOS ---');
    console.log(JSON.stringify(negocios, null, 2));

    const usuarios = await prisma.usuario.findMany({
        select: { id: true, email: true, negocioId: true, role: true }
    });
    console.log('--- USUARIOS ---');
    console.log(JSON.stringify(usuarios, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
