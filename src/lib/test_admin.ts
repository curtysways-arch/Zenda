import prisma from './prisma';
async function main() {
    const adminConfig = await prisma.globalConfig.findUnique({
        where: { clave: 'NUMERO_WHATSAPP_ADMIN' }
    });
    console.log('Admin WA:', adminConfig);
}
main().finally(() => prisma.$disconnect());
