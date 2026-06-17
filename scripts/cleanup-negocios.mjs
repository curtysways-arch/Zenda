const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Ver todos los negocios
    const todos = await prisma.negocio.findMany({ select: { id: true, nombre: true, slug: true, isDemo: true } });
    console.log('\n📋 NEGOCIOS ACTUALES:');
    console.table(todos);

    // 2. Encontrar el complejo-test
    const demo = await prisma.negocio.findFirst({ where: { slug: 'complejo-test' } });
    if (!demo) {
        console.error('❌ No se encontró "complejo-test"');
        return;
    }
    console.log(`\n✅ Demo encontrado: ${demo.nombre} (ID: ${demo.id})`);

    // 3. Marcar como demo
    await prisma.negocio.update({
        where: { id: demo.id },
        data: { isDemo: true }
    });
    console.log('✅ Marcado como isDemo = true');

    // 4. Dar acceso al superadmin
    const superadmin = await prisma.usuario.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (superadmin) {
        console.log(`\n👤 SuperAdmin encontrado: ${superadmin.email}`);
        await prisma.usuario.update({
            where: { id: superadmin.id },
            data: { negocioId: demo.id }
        });
        console.log('✅ SuperAdmin asociado al negocio demo');
    } else {
        console.log('⚠️ No se encontró usuario SUPER_ADMIN');
    }

    // 5. Eliminar todos los demás negocios
    const aEliminar = todos.filter(n => n.id !== demo.id);
    console.log(`\n🗑️ Negocios a eliminar: ${aEliminar.map(n => n.nombre).join(', ')}`);

    for (const negocio of aEliminar) {
        try {
            // Desvincular usuarios primero para evitar FK errors
            await prisma.usuario.updateMany({
                where: { negocioId: negocio.id },
                data: { negocioId: null }
            });
            await prisma.negocio.delete({ where: { id: negocio.id } });
            console.log(`  ❌ Eliminado: ${negocio.nombre}`);
        } catch (e) {
            console.error(`  ⚠️ Error eliminando ${negocio.nombre}:`, e.message);
        }
    }

    // 6. Estado final
    const finales = await prisma.negocio.findMany({ select: { id: true, nombre: true, slug: true, isDemo: true } });
    console.log('\n✅ ESTADO FINAL:');
    console.table(finales);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
