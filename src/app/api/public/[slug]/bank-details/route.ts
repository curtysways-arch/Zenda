import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const negocio = await prisma.negocio.findUnique({
            where: { slug },
            select: { id: true, nombre: true, configuracion: true }
        });

        if (!negocio) {
            return NextResponse.json({ success: false, error: 'Negocio no encontrado' }, { status: 404 });
        }

        const config = typeof negocio.configuracion === 'string'
            ? (() => { try { return JSON.parse(negocio.configuracion as string); } catch { return {}; } })()
            : ((negocio.configuracion as any) || {});

        let bankProvider = await prisma.paymentProvider.findUnique({
            where: { code: 'BANK_TRANSFER' }
        });

        if (!bankProvider) {
            bankProvider = await prisma.paymentProvider.create({
                data: {
                    code: 'BANK_TRANSFER',
                    name: 'Transferencia Bancaria',
                    description: 'Pago por transferencia bancaria directa con comprobante.',
                    enabled: true,
                    isGateway: false
                }
            });
        }

        let method = await prisma.paymentMethod.findFirst({
            where: { negocioId: negocio.id, providerId: bankProvider.id },
            include: { provider: true }
        });

        if (!method) {
            method = await prisma.paymentMethod.create({
                data: {
                    negocioId: negocio.id,
                    providerId: bankProvider.id,
                    enabled: true,
                    customName: 'Transferencia Bancaria Directa',
                    banco: 'Banco Pichincha',
                    titular: 'Pinchos Ecosistema Citiox',
                    numeroCuenta: '2100987654',
                    tipoCuenta: 'Ahorros',
                    identificacion: '1792345678001',
                    instructions: 'Por favor realiza la transferencia del monto exacto e ingresa tu código de pedido en el concepto.'
                },
                include: { provider: true }
            });
        }

        const extraConfig = (typeof method.extraConfig === 'object' && method.extraConfig) ? (method.extraConfig as any) : {};
        const isPinchos = slug === 'pinchos';
        const soloPagoPrevio = !isPinchos && (config.soloPagoPrevio ?? extraConfig.soloPagoPrevio ?? true);
        const permiteContraentrega = isPinchos || (config.permiteContraentrega ?? extraConfig.permiteContraentrega ?? false);

        const defaultCuentas = Array.isArray(extraConfig.cuentas) && extraConfig.cuentas.length > 0
            ? extraConfig.cuentas
            : [
                {
                    id: 'acc_main',
                    banco: method.banco,
                    titular: method.titular,
                    numeroCuenta: method.numeroCuenta,
                    tipoCuenta: method.tipoCuenta,
                    identificacion: method.identificacion,
                    instructions: method.instructions,
                    qrImageUrl: method.qrImageUrl
                }
            ];

        const metodosContraentrega = Array.isArray(extraConfig.metodosContraentrega)
            ? extraConfig.metodosContraentrega
            : ['EFECTIVO', 'TRANSFERENCIA'];

        return NextResponse.json({
            success: true,
            method: {
                banco: method.banco,
                titular: method.titular,
                numeroCuenta: method.numeroCuenta,
                tipoCuenta: method.tipoCuenta,
                identificacion: method.identificacion,
                instructions: method.instructions,
                customName: method.customName,
                qrImageUrl: method.qrImageUrl,
                soloPagoPrevio,
                permiteContraentrega,
                metodosContraentrega,
                cuentas: defaultCuentas
            }
        });
    } catch (error) {
        console.error('Error al obtener datos bancarios públicos:', error);
        return NextResponse.json({ success: false, error: 'Error al obtener datos bancarios' }, { status: 500 });
    }
}
