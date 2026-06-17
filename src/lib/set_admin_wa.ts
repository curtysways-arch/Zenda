import prisma from './prisma';

async function main() {
    await prisma.globalConfig.upsert({
        where: { clave: 'NUMERO_WHATSAPP_ADMIN' },
        update: { valor: '0983173408' },
        create: {
            id: require('crypto').randomUUID(),
            clave: 'NUMERO_WHATSAPP_ADMIN',
            valor: '0983173408'
        }
    });
    console.log('NUMERO_WHATSAPP_ADMIN set to 0983173408');
}
main().finally(() => prisma.$disconnect());
