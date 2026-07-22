import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(req.url);
        const businessId = searchParams.get('businessId') || (session?.user as any)?.negocioId;

        if (!businessId) {
            return NextResponse.json(
                { success: false, error: 'Negocio no especificado.' },
                { status: 400 }
            );
        }

        // Asegurar que existe el PaymentProvider para transferencia bancaria
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

        // Buscar configuración del método para este negocio
        let method = await prisma.paymentMethod.findFirst({
            where: { negocioId: businessId, providerId: bankProvider.id },
            include: { provider: true }
        });

        if (!method) {
            // Crear una configuración por defecto si no existe
            method = await prisma.paymentMethod.create({
                data: {
                    negocioId: businessId,
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

        return NextResponse.json({
            success: true,
            method
        });
    } catch (error: any) {
        console.error('Error al obtener métodos de pago:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const body = await req.json();
        const {
            businessId: reqBusinessId,
            enabled,
            customName,
            banco,
            titular,
            numeroCuenta,
            tipoCuenta,
            identificacion,
            qrImageUrl,
            instructions
        } = body;

        const businessId = reqBusinessId || (session?.user as any)?.negocioId;

        if (!businessId) {
            return NextResponse.json(
                { success: false, error: 'Negocio no especificado.' },
                { status: 400 }
            );
        }

        // Obtener proveedor BANK_TRANSFER
        let bankProvider = await prisma.paymentProvider.findUnique({
            where: { code: 'BANK_TRANSFER' }
        });

        if (!bankProvider) {
            bankProvider = await prisma.paymentProvider.create({
                data: {
                    code: 'BANK_TRANSFER',
                    name: 'Transferencia Bancaria',
                    enabled: true
                }
            });
        }

        const existing = await prisma.paymentMethod.findFirst({
            where: { negocioId: businessId, providerId: bankProvider.id }
        });

        let updatedMethod;
        if (existing) {
            updatedMethod = await prisma.paymentMethod.update({
                where: { id: existing.id },
                data: {
                    enabled: enabled !== undefined ? enabled : true,
                    customName: customName || existing.customName,
                    banco: banco !== undefined ? banco : existing.banco,
                    titular: titular !== undefined ? titular : existing.titular,
                    numeroCuenta: numeroCuenta !== undefined ? numeroCuenta : existing.numeroCuenta,
                    tipoCuenta: tipoCuenta !== undefined ? tipoCuenta : existing.tipoCuenta,
                    identificacion: identificacion !== undefined ? identificacion : existing.identificacion,
                    qrImageUrl: qrImageUrl !== undefined ? qrImageUrl : existing.qrImageUrl,
                    instructions: instructions !== undefined ? instructions : existing.instructions
                }
            });
        } else {
            updatedMethod = await prisma.paymentMethod.create({
                data: {
                    negocioId: businessId,
                    providerId: bankProvider.id,
                    enabled: enabled !== undefined ? enabled : true,
                    customName: customName || 'Transferencia Bancaria Directa',
                    banco,
                    titular,
                    numeroCuenta,
                    tipoCuenta,
                    identificacion,
                    qrImageUrl,
                    instructions
                }
            });
        }

        return NextResponse.json({
            success: true,
            method: updatedMethod,
            message: 'Configuración de transferencia bancaria guardada con éxito.'
        });
    } catch (error: any) {
        console.error('Error al guardar método de pago:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
