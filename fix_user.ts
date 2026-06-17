import prisma from './src/lib/prisma.ts';

async function main() {
    const business = await prisma.negocio.findFirst();
    if (!business) {
        console.log('No hay negocios en la BD');
        return;
    }

    const user = await prisma.usuario.findUnique({
        where: { email: 'curtysways@gmail.com' }
    });

    if (user) {
        await prisma.usuario.update({
            where: { id: user.id },
            data: { 
                negocioId: business.id,
                role: 'ADMIN_NEGOCIO' // Aseguramos que tenga rol de admin
            }
        });
        console.log(`Usuario ${user.email} vinculado al negocio ${business.nombre}`);
    } else {
        console.log('Usuario curtysways@gmail.com no encontrado');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
