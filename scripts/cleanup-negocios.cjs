const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const todos = await prisma.negocio.findMany({ select: { id: true, nombre: true, slug: true, isDemo: true } });
    console.log('\n📋 NEGOCIOS ACTUALES:');
    todos.forEach(n => console.log(`  - ${n.nombre} | slug: ${n.slug} | demo: ${n.isDemo} | id: ${n.id}`));

    const demo = await prisma.negocio.findFirst({ where: { slug: 'complejo-test' } });
    if (!demo) { console.error('❌ No se encontró complejo-test'); return; }
    console.log(`\n✅ Demo: ${demo.nombre} (${demo.id})`);

    await prisma.negocio.update({ where: { id: demo.id }, data: { isDemo: true } });
    console.log('✅ isDemo = true');

    const superadmin = await prisma.usuario.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (superadmin) {
        await prisma.usuario.update({ where: { id: superadmin.id }, data: { negocioId: demo.id } });
        console.log('✅ SuperAdmin (' + superadmin.email + ') -> complejo-test');
    }

    const aEliminar = todos.filter(n => n.id !== demo.id);
    for (const neg of aEliminar) {
        try {
            await prisma.usuario.updateMany({ where: { negocioId: neg.id }, data: { negocioId: null } });
            await prisma.negocio.delete({ where: { id: neg.id } });
            console.log('❌ Eliminado: ' + neg.nombre);
        } catch (e) {
            console.error('⚠️ No se pudo eliminar ' + neg.nombre + ':', e.message);
        }
    }

    const final = await prisma.negocio.findMany({ select: { id: true, nombre: true, slug: true, isDemo: true } });
    console.log('\n✅ ESTADO FINAL:');
    final.forEach(n => console.log(`  - ${n.nombre} | demo: ${n.isDemo}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
