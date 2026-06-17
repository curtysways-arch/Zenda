import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payments';

export async function POST(req: Request) {
    try {
        const { reservaId } = await req.json();

        const reserva = await prisma.reserva.findUnique({
            where: { id: reservaId },
            include: {
                negocio: true,
                cancha: true,
                cliente: true
            }
        });

        if (!reserva || !reserva.negocio.pagosActivos) {
            return NextResponse.json({ error: 'Pagos no configurados o reserva no encontrada' }, { status: 400 });
        }

        const { mercadoPagoAccessToken, mercadoPagoPublicKey, pagoPorcentaje, nombre: negocioNombre } = reserva.negocio;

        if (!mercadoPagoAccessToken || !mercadoPagoPublicKey) {
            return NextResponse.json({ error: 'Credenciales de pago faltantes' }, { status: 500 });
        }

        const paymentService = new PaymentService(mercadoPagoAccessToken, mercadoPagoPublicKey);

        // Calcular el monto de la seña
        const total = Number(reserva.total);
        const montoSena = (total * (pagoPorcentaje || 50)) / 100;

        const items = [
            {
                title: `Seña Reserva - ${reserva.cancha.nombre} (${reserva.negocio.nombre})`,
                unit_price: montoSena,
                quantity: 1,
                currency_id: 'ARS' // O el de tu país
            }
        ];

        const preference = await paymentService.createPreference(
            items,
            reserva.id,
            {
                success: `${process.env.NEXTAUTH_URL}/${reserva.negocio.slug}/pago-exito`,
                failure: `${process.env.NEXTAUTH_URL}/${reserva.negocio.slug}/pago-error`,
                pending: `${process.env.NEXTAUTH_URL}/${reserva.negocio.slug}/pago-pendiente`
            }
        );

        // Guardar el ID de preferencia en la reserva
        await prisma.reserva.update({
            where: { id: reservaId },
            data: { pagoId: preference.id }
        });

        return NextResponse.json({ preferenceId: preference.id, initPoint: preference.init_point });
    } catch (error) {
        console.error('Error creating payment:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
