import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasModule } from '@/lib/business/BusinessModuleResolver';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await context.params;
        const { searchParams } = new URL(req.url);
        const phone = searchParams.get('phone');

        if (!phone) {
            return NextResponse.json(
                { success: false, error: 'El parámetro teléfono es requerido.' },
                { status: 400 }
            );
        }

        const negocio = await prisma.negocio.findUnique({
            where: { slug }
        });

        if (!negocio) {
            return NextResponse.json(
                { success: false, error: 'Negocio no encontrado.' },
                { status: 404 }
            );
        }

        // 🟢 Validación de Módulo
        if (!hasModule(negocio.tipoNegocio, 'ORDERS')) {
            return NextResponse.json(
                { success: false, error: 'MODULE_NOT_AVAILABLE', message: 'El módulo de pedidos no está disponible para este negocio.' },
                { status: 403 }
            );
        }

        const rawPhone = phone.trim();
        const cleanDigits = phone.replace(/\D/g, '');
        const digits9 = cleanDigits.length >= 9 ? cleanDigits.slice(-9) : cleanDigits;
        const digits7 = cleanDigits.length >= 7 ? cleanDigits.slice(-7) : cleanDigits;

        const phoneConditions = [
            { telefonoCliente: { contains: rawPhone } },
            { telefonoCliente: { contains: cleanDigits } },
            { telefonoCliente: { contains: digits9 } },
            { telefonoCliente: { contains: digits7 } }
        ];

        // 🔒 Consulta delimitada ESTRICTAMENTE por negocioId (sin fallbacks cross-tenant)
        const orders = await prisma.pedido.findMany({
            where: {
                negocioId: negocio.id,
                OR: phoneConditions
            },
            include: {
                items: true,
                payment: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            orders,
            pedidos: orders
        });

    } catch (error: any) {
        console.error('Error al consultar pedidos del cliente:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
