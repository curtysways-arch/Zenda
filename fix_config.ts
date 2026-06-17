import prisma from './src/lib/prisma';

async function main() {
    console.log('🔄 Actualizando templates de configuración para limpiar emojis de pelotas y términos deportivos...');

    // Borrar configuraciones obsoletas que tienen 'partido' o '⚽'
    const deleted = await prisma.configuracion.deleteMany({
        where: {
            OR: [
                { valor: { contains: 'partido' } },
                { valor: { contains: '⚽' } },
                { valor: { contains: '🎾' } }
            ]
        }
    });

    console.log(`✅ Se limpiaron ${deleted.count} templates obsoletos.`);
    console.log('✨ Los negocios ahora usarán los nuevos templates de Spa por defecto (o pueden volver a guardarlos desde Configuración).');
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
