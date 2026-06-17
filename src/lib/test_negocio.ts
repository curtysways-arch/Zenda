import prisma from './prisma';

async function main() {
    // Get the most recent payment
    const payment = await prisma.payment.findFirst({
        orderBy: { fecha_pago: 'desc' },
        include: { Negocio: true }
    });
    console.log('Last payment negocio phone:', payment?.Negocio?.whatsapp);
}
main().finally(() => prisma.$disconnect());
