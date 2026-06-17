import prisma from './src/lib/prisma.ts';

async function main() {
    console.log('--- GLOBAL CONFIGS ---');
    const configs = await prisma.globalConfig.findMany();
    console.log(JSON.stringify(configs, null, 2));

    console.log('\n--- NEGOCIOS Y WHATSAPP ---');
    const negocios = await prisma.negocio.findMany({
        select: {
            id: true,
            nombre: true,
            whatsapp: true,
            Suscripcion: {
                select: {
                    estado: true,
                    fechaFin: true
                }
            }
        }
    });
    console.log(JSON.stringify(negocios, null, 2));

    console.log('\n--- ULTIMOS PAGOS ---');
    const payments = await prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
            negocio: { select: { nombre: true, whatsapp: true } },
            plan: { select: { name: true } }
        }
    });
    console.log(JSON.stringify(payments, null, 2));

    console.log('\n--- REINTENTOS DE MENSAJES DE WHATSAPP (FALLIDOS) ---');
    const retries = await (prisma as any).retryMessage.findMany({
        take: 10
    });
    console.log(JSON.stringify(retries, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
