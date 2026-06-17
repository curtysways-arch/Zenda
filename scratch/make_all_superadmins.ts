import prisma from '../src/lib/prisma';

async function main() {
    try {
        // Actualizar admin@spa.com
        const adminSpa = await prisma.usuario.findFirst({
            where: { email: 'admin@spa.com' }
        });
        if (adminSpa) {
            await prisma.usuario.update({
                where: { id: adminSpa.id },
                data: { role: 'SUPERADMIN' }
            });
            console.log('✅ Rol de admin@spa.com actualizado con éxito a SUPERADMIN');
        }

        // Actualizar demo@canchasaas.com
        const adminDemo = await prisma.usuario.findFirst({
            where: { email: 'demo@canchasaas.com' }
        });
        if (adminDemo) {
            await prisma.usuario.update({
                where: { id: adminDemo.id },
                data: { role: 'SUPERADMIN' }
            });
            console.log('✅ Rol de demo@canchasaas.com actualizado con éxito a SUPERADMIN');
        }
    } catch (e) {
        console.error('Error running script:', e);
    }
}

main().finally(() => process.exit(0));
