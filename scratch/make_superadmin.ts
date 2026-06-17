import prisma from '../src/lib/prisma';

async function main() {
    try {
        const user = await prisma.usuario.findFirst({
            where: { email: 'admin@spa.com' }
        });

        if (user) {
            await prisma.usuario.update({
                where: { id: user.id },
                data: { role: 'SUPERADMIN' }
            });
            console.log('✅ Rol de admin@spa.com actualizado con éxito a SUPERADMIN');
        } else {
            console.log('❌ No se encontró el usuario admin@spa.com');
        }
    } catch (e) {
        console.error('Error running script:', e);
    }
}

main().finally(() => process.exit(0));
